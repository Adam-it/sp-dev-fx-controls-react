import * as React from 'react';
import { BaseComponentContext } from '@microsoft/sp-component-base';
import { Guid } from '@microsoft/sp-core-library';
import { IIconProps } from 'office-ui-fabric-react/lib/components/Icon';
import {
  PrimaryButton,
  DefaultButton,
  IconButton,
  IButtonStyles
} from 'office-ui-fabric-react/lib/Button';
import { Label } from 'office-ui-fabric-react/lib/Label';
import {
  Panel,
  PanelType
} from 'office-ui-fabric-react/lib/Panel';
import {
  IBasePickerStyleProps,
  IBasePickerStyles,
  ISuggestionItemProps
} from 'office-ui-fabric-react/lib/Pickers';
import {
  IStackTokens,
  Stack
} from 'office-ui-fabric-react/lib/Stack';
import { IStyleFunctionOrObject } from 'office-ui-fabric-react/lib/Utilities';
import { sp } from '@pnp/sp';
import { SPTaxonomyService } from '../../services/SPTaxonomyService';
import { TaxonomyPanelContents } from './taxonomyPanelContents';
import styles from './ModernTaxonomyPicker.module.scss';
import * as strings from 'ControlStrings';
import { TooltipHost, ITooltipHostStyles } from 'office-ui-fabric-react/lib/Tooltip';
import { useId } from '@uifabric/react-hooks';
import {
  ITermInfo,
  ITermSetInfo,
  ITermStoreInfo
} from '@pnp/sp/taxonomy';
import { TermItemSuggestion } from './termItem/TermItemSuggestion';
import { ModernTermPicker } from './modernTermPicker/ModernTermPicker';
import { IModernTermPickerProps, ITermItemProps } from './modernTermPicker/ModernTermPicker.types';
import { TermItem } from './termItem/TermItem';
import { IReadonlyTheme } from '@microsoft/sp-component-base';
import { SelectChildrenMode } from '../../common/model/TreeCommon';

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export interface IModernTaxonomyPickerProps {
  /**
   * Defines if the user can select only one or multiple terms. Default value is false.
   */
  allowMultipleSelections?: boolean;
  /**
   * The Id of the TermSet that you would like the Taxonomy Picker to select terms from.
   */
  termSetId: string;
  /**
   * Set the id of a child term in the TermSet to be able to select terms from that level and below.
   */
  anchorTermId?: string;
  /**
   * TermSet Picker Panel title.
   */
  panelTitle: string;
  /**
   * Text displayed above the Taxonomy Picker.
   */
  label: string;
  /**
   * Context of the current web part or extension.
   */
  context: BaseComponentContext;
  /**
   * Defines the terms selected by default. ITermInfo comes from PnP/PnPjs and can be imported with import { ITermInfo } from '@pnp/sp/taxonomy';
   */
  initialValues?: Optional<ITermInfo, "childrenCount" | "createdDateTime" | "lastModifiedDateTime" | "descriptions" | "customSortOrder" | "properties" | "localProperties" | "isDeprecated" | "isAvailableForTagging" | "topicRequested">[];
  /**
   * Specify if the control should be disabled. Default value is false.
   */
  disabled?: boolean;
  /**
   * Specifies if to display an asterisk near the label. Default value is false.
   */
  required?: boolean;
  /**
   * Captures the event of when the terms in the picker has changed.
   */
  onChange?: (newValue?: ITermInfo[]) => void;
  /**
   * Optional custom renderer for a picker item.
   */
  onRenderItem?: (itemProps: ITermItemProps) => JSX.Element;
  /**
   * Optional custom renderer for picker's suggestions item.
   */
  onRenderSuggestionsItem?: (term: ITermInfo, itemProps: ISuggestionItemProps<ITermInfo>) => JSX.Element;
  /**
   * Short text hint to display in picker.
   */
  placeHolder?: string;
  /**
   * Custom panel width in pixels.
   */
  customPanelWidth?: number;
  /**
   * The current loaded SharePoint theme/section background.
   */
  themeVariant?: IReadonlyTheme;
  /**
   * Custom properties for the term picker.
   */
  termPickerProps?: Optional<IModernTermPickerProps, 'onResolveSuggestions'>;
  /**
   * Whether the panel can be light dismissed.
   */
  isLightDismiss?: boolean;
  /**
   * Whether the panel uses a modal overlay or not.
   */
  isBlocking?: boolean;
  /**
   * Optional custom renderer for adding e.g. a button with additional actions to the terms in the tree view.
   */
  onRenderActionButton?: (termStoreInfo: ITermStoreInfo, termSetInfo: ITermSetInfo, termInfo?: ITermInfo) => JSX.Element;
  /**
   * Specifies if the children should be selected when parent item is selected (defaults to None).
   * Current options are None or Select | Unselect.
   * If Select or Unselect is specified it will be converted to Select | Unselect.
   * If any other value is specified it will be converted to None.
   */
  selectChildrenMode?: SelectChildrenMode;
}

export function ModernTaxonomyPicker(props: IModernTaxonomyPickerProps) {
  const taxonomyService = new SPTaxonomyService(props.context);
  const [panelIsOpen, setPanelIsOpen] = React.useState(false);
  const initialLoadComplete = React.useRef(false);
  const [selectedOptions, setSelectedOptions] = React.useState<ITermInfo[]>([]);
  const [selectedPanelOptions, setSelectedPanelOptions] = React.useState<ITermInfo[]>([]);
  const [currentTermStoreInfo, setCurrentTermStoreInfo] = React.useState<ITermStoreInfo>();
  const [currentTermSetInfo, setCurrentTermSetInfo] = React.useState<ITermSetInfo>();
  const [currentAnchorTermInfo, setCurrentAnchorTermInfo] = React.useState<ITermInfo>();
  const [currentLanguageTag, setCurrentLanguageTag] = React.useState<string>("");

  React.useEffect(() => {
    sp.setup(props.context);
    taxonomyService.getTermStoreInfo()
      .then((termStoreInfo) => {
        setCurrentTermStoreInfo(termStoreInfo);
        const languageTag = props.context.pageContext.cultureInfo.currentUICultureName !== '' ?
          props.context.pageContext.cultureInfo.currentUICultureName :
          currentTermStoreInfo.defaultLanguageTag;
        setCurrentLanguageTag(languageTag);
        setSelectedOptions(Array.isArray(props.initialValues) ?
          props.initialValues.map(term => { return { ...term, languageTag: languageTag, termStoreInfo: termStoreInfo } as ITermInfo; }) :
          []);
          initialLoadComplete.current = true;
      });
    taxonomyService.getTermSetInfo(Guid.parse(props.termSetId))
      .then((termSetInfo) => {
        setCurrentTermSetInfo(termSetInfo);
      });
    if (props.anchorTermId && props.anchorTermId !== Guid.empty.toString()) {
      taxonomyService.getTermById(Guid.parse(props.termSetId), props.anchorTermId ? Guid.parse(props.anchorTermId) : Guid.empty)
        .then((anchorTermInfo) => {
          setCurrentAnchorTermInfo(anchorTermInfo);
        });
    }
  }, []);

  React.useEffect(() => {
    if (props.onChange && initialLoadComplete.current) {
      props.onChange(selectedOptions);
    }
  }, [selectedOptions]);

  function onOpenPanel(): void {
    if (props.disabled === true) {
      return;
    }
    setSelectedPanelOptions(selectedOptions);
    setPanelIsOpen(true);
  }

  function onClosePanel(): void {
    setSelectedPanelOptions([]);
    setPanelIsOpen(false);
  }

  function onApply(): void {
    setSelectedOptions([...selectedPanelOptions]);
    onClosePanel();
  }

  async function onResolveSuggestions(filter: string, selectedItems?: ITermInfo[]): Promise<ITermInfo[]> {
    if (filter === '') {
      return [];
    }
    const filteredTerms = await taxonomyService.searchTerm(Guid.parse(props.termSetId), filter, currentLanguageTag, props.anchorTermId ? Guid.parse(props.anchorTermId) : Guid.empty);
    const filteredTermsWithoutSelectedItems = filteredTerms.filter((term) => {
      if (!selectedItems || selectedItems.length === 0) {
        return true;
      }
      return selectedItems.every((item) => item.id !== term.id);
    });
    const filteredTermsAndAvailable = filteredTermsWithoutSelectedItems.filter((term) => term.isAvailableForTagging.filter((t) => t.setId === props.termSetId)[0].isAvailable);
    return filteredTermsAndAvailable;
  }

  async function onLoadParentLabel(termId: Guid): Promise<string> {
    const termInfo = await taxonomyService.getTermById(Guid.parse(props.termSetId), termId);
    if (termInfo.parent) {
      let labelsWithMatchingLanguageTag = termInfo.parent.labels.filter((termLabel) => (termLabel.languageTag === currentLanguageTag));
      if (labelsWithMatchingLanguageTag.length === 0) {
        labelsWithMatchingLanguageTag = termInfo.parent.labels.filter((termLabel) => (termLabel.languageTag === currentTermStoreInfo.defaultLanguageTag));
      }
      return labelsWithMatchingLanguageTag[0]?.name;
    }
    else {
      let termSetNames = currentTermSetInfo.localizedNames.filter((name) => name.languageTag === currentLanguageTag);
      if (termSetNames.length === 0) {
        termSetNames = currentTermSetInfo.localizedNames.filter((name) => name.languageTag === currentTermStoreInfo.defaultLanguageTag);
      }
      return termSetNames[0].name;
    }
  }

  function onRenderSuggestionsItem(term: ITermInfo, itemProps: ISuggestionItemProps<ITermInfo>): JSX.Element {
    return (
      <TermItemSuggestion
        onLoadParentLabel={onLoadParentLabel}
        term={term}
        termStoreInfo={currentTermStoreInfo}
        languageTag={currentLanguageTag}
        {...itemProps}
      />
    );
  }

  function onRenderItem(itemProps: ITermItemProps): JSX.Element {
    let labels = itemProps.item.labels.filter((name) => name.languageTag === currentLanguageTag && name.isDefault);
    if (labels.length === 0) {
      labels = itemProps.item.labels.filter((name) => name.languageTag === currentTermStoreInfo.defaultLanguageTag && name.isDefault);
    }

    return labels.length > 0 ? (
      <TermItem languageTag={currentLanguageTag} termStoreInfo={currentTermStoreInfo} {...itemProps}>{labels[0].name}</TermItem>
    ) : null;
  }

  function getTextFromItem(termInfo: ITermInfo): string {
    let labelsWithMatchingLanguageTag = termInfo.labels.filter((termLabel) => (termLabel.languageTag === currentLanguageTag));
    if (labelsWithMatchingLanguageTag.length === 0) {
      labelsWithMatchingLanguageTag = termInfo.labels.filter((termLabel) => (termLabel.languageTag === currentTermStoreInfo.defaultLanguageTag));
    }
    return labelsWithMatchingLanguageTag[0]?.name;
  }

  const calloutProps = { gapSpace: 0 };
  const tooltipId = useId('tooltip');
  const hostStyles: Partial<ITooltipHostStyles> = { root: { display: 'inline-block' } };
  const addTermButtonStyles: IButtonStyles = { rootHovered: { backgroundColor: 'inherit' }, rootPressed: { backgroundColor: 'inherit' } };
  const termPickerStyles: IStyleFunctionOrObject<IBasePickerStyleProps, IBasePickerStyles> = { input: { minheight: 34 }, text: { minheight: 34 } };

  return (
    <div className={styles.modernTaxonomyPicker}>
      {props.label && <Label required={props.required}>{props.label}</Label>}
      <div className={styles.termField}>
        <div className={styles.termFieldInput}>
          <ModernTermPicker
            {...props.termPickerProps}
            removeButtonAriaLabel={strings.ModernTaxonomyPickerRemoveButtonText}
            onResolveSuggestions={props.termPickerProps?.onResolveSuggestions ?? onResolveSuggestions}
            itemLimit={props.allowMultipleSelections ? undefined : 1}
            selectedItems={selectedOptions}
            disabled={props.disabled}
            styles={props.termPickerProps?.styles ?? termPickerStyles}
            onChange={(itms?: ITermInfo[]) => {
              setSelectedOptions(itms || []);
              setSelectedPanelOptions(itms || []);
            }}
            getTextFromItem={getTextFromItem}
            pickerSuggestionsProps={props.termPickerProps?.pickerSuggestionsProps ?? { noResultsFoundText: strings.ModernTaxonomyPickerNoResultsFound }}
            inputProps={props.termPickerProps?.inputProps ?? {
              'aria-label': props.placeHolder || strings.ModernTaxonomyPickerDefaultPlaceHolder,
              placeholder: props.placeHolder || strings.ModernTaxonomyPickerDefaultPlaceHolder
            }}
            onRenderSuggestionsItem={props.onRenderSuggestionsItem ?? onRenderSuggestionsItem}
            onRenderItem={props.onRenderItem ?? onRenderItem}
            themeVariant={props.themeVariant}
          />
        </div>
        <div className={styles.termFieldButton}>
          <TooltipHost
            content={strings.ModernTaxonomyPickerAddTagButtonTooltip}
            id={tooltipId}
            calloutProps={calloutProps}
            styles={hostStyles}
          >
            <IconButton disabled={props.disabled} styles={addTermButtonStyles} iconProps={{ iconName: 'Tag' } as IIconProps} onClick={onOpenPanel} aria-describedby={tooltipId} />
          </TooltipHost>
        </div>
      </div>

      <Panel
        isOpen={panelIsOpen}
        hasCloseButton={true}
        closeButtonAriaLabel={strings.ModernTaxonomyPickerPanelCloseButtonText}
        onDismiss={onClosePanel}
        isLightDismiss={props.isLightDismiss}
        isBlocking={props.isBlocking}
        type={props.customPanelWidth ? PanelType.custom : PanelType.medium}
        customWidth={props.customPanelWidth ? `${props.customPanelWidth}px` : undefined}
        headerText={props.panelTitle}
        onRenderFooterContent={() => {
          const horizontalGapStackTokens: IStackTokens = {
            childrenGap: 10,
          };
          return (
            <Stack horizontal disableShrink tokens={horizontalGapStackTokens}>
              <PrimaryButton text={strings.ModernTaxonomyPickerApplyButtonText} value='Apply' onClick={onApply} />
              <DefaultButton text={strings.ModernTaxonomyPickerCancelButtonText} value='Cancel' onClick={onClosePanel} />
            </Stack>
          );
        }}>

        {
          props.termSetId && (
            <div key={props.termSetId} >
              <TaxonomyPanelContents
                allowMultipleSelections={props.allowMultipleSelections}
                onResolveSuggestions={props.termPickerProps?.onResolveSuggestions ?? onResolveSuggestions}
                onLoadMoreData={taxonomyService.getTerms}
                anchorTermInfo={currentAnchorTermInfo}
                termSetInfo={currentTermSetInfo}
                termStoreInfo={currentTermStoreInfo}
                pageSize={50}
                selectedPanelOptions={selectedPanelOptions}
                setSelectedPanelOptions={setSelectedPanelOptions}
                placeHolder={props.placeHolder || strings.ModernTaxonomyPickerDefaultPlaceHolder}
                onRenderSuggestionsItem={props.onRenderSuggestionsItem ?? onRenderSuggestionsItem}
                onRenderItem={props.onRenderItem ?? onRenderItem}
                getTextFromItem={getTextFromItem}
                languageTag={currentLanguageTag}
                themeVariant={props.themeVariant}
                termPickerProps={props.termPickerProps}
                onRenderActionButton={props.onRenderActionButton}
              />
            </div>
          )
        }
      </Panel>
    </div >
  );
}
