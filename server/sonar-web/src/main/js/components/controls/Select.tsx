/*
 * SonarQube
 * Copyright (C) 2009-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import styled from '@emotion/styled';
import classNames from 'classnames';
import { omit } from 'lodash';
import * as React from 'react';
import ReactSelect, {
  ClearIndicatorProps,
  components,
  DropdownIndicatorProps,
  GroupBase,
  LoadingIndicatorProps,
  MultiValueRemoveProps,
  Props as NamedProps,
  StylesConfig,
} from 'react-select';
import AsyncReactSelect, { AsyncProps } from 'react-select/async';
import AsyncCreatableReactSelect, { AsyncCreatableProps } from 'react-select/async-creatable';
import { colors, others, sizes, zIndexes } from '../../app/theme';
import { ClearButton } from './buttons';

const ArrowSpan = styled.span`
  border-color: ${colors.gray52} transparent transparent;
  border-style: solid;
  border-width: 4px 4px 2px;
  display: inline-block;
  height: 0;
  width: 0;
`;

export interface LabelValueSelectOption<V = string> {
  label: string;
  value: V;
}

interface StyleExtensionProps {
  large?: boolean;
}

export function dropdownIndicator<
  Option = LabelValueSelectOption,
  IsMulti extends boolean = boolean,
  Group extends GroupBase<Option> = GroupBase<Option>,
>({ innerProps }: DropdownIndicatorProps<Option, IsMulti, Group>) {
  return <ArrowSpan {...innerProps} />;
}

export function clearIndicator<
  Option = LabelValueSelectOption,
  IsMulti extends boolean = boolean,
  Group extends GroupBase<Option> = GroupBase<Option>,
>(props: ClearIndicatorProps<Option, IsMulti, Group>) {
  const { innerProps } = props;
  return (
    <div {...innerProps} className="spacer-left spacer-right">
      {/* We use tabindex="-1" to prevent the clear button from being focused via tabbing.*/}
      {/* This is done to align with react-select default behavior and because backspace already clears the select value. */}
      <ClearButton className="button-tiny" iconProps={{ size: 12 }} tabIndex={-1} />
    </div>
  );
}

export function loadingIndicator<
  Option = LabelValueSelectOption,
  IsMulti extends boolean = boolean,
  Group extends GroupBase<Option> = GroupBase<Option>,
>({ innerProps }: LoadingIndicatorProps<Option, IsMulti, Group>) {
  return <i className={classNames('spinner spacer-left spacer-right', innerProps.className)} />;
}

export function multiValueRemove<
  Option = LabelValueSelectOption,
  IsMulti extends boolean = boolean,
  Group extends GroupBase<Option> = GroupBase<Option>,
>(props: MultiValueRemoveProps<Option, IsMulti, Group>) {
  return <components.MultiValueRemove {...props}>&times;</components.MultiValueRemove>;
}

export default function Select<
  Option = LabelValueSelectOption,
  IsMulti extends boolean = boolean,
  Group extends GroupBase<Option> = GroupBase<Option>,
>(props: NamedProps<Option, IsMulti, Group> & Readonly<StyleExtensionProps>) {
  return (
    <ReactSelect<Option, IsMulti, Group>
      {...omit(props, 'className', 'large')}
      styles={selectStyle<Option, IsMulti, Group>(props)}
      className={classNames('react-select', props.className)}
      classNamePrefix="react-select"
      components={{
        ...props.components,
        DropdownIndicator: dropdownIndicator,
        ClearIndicator: clearIndicator,
        MultiValueRemove: multiValueRemove,
      }}
    />
  );
}

export function CreatableSelect<
  Option = LabelValueSelectOption,
  IsMulti extends boolean = boolean,
  Group extends GroupBase<Option> = GroupBase<Option>,
>(props: AsyncCreatableProps<Option, IsMulti, Group>) {
  return (
    <AsyncCreatableReactSelect<Option, IsMulti, Group>
      {...props}
      styles={selectStyle<Option, IsMulti, Group>()}
      components={{
        ...props.components,
        DropdownIndicator: dropdownIndicator,
        ClearIndicator: clearIndicator,
        MultiValueRemove: multiValueRemove,
        LoadingIndicator: loadingIndicator,
      }}
    />
  );
}

export function SearchSelect<
  Option = LabelValueSelectOption,
  IsMulti extends boolean = boolean,
  Group extends GroupBase<Option> = GroupBase<Option>,
>(
  props: NamedProps<Option, IsMulti, Group> &
    AsyncProps<Option, IsMulti, Group> &
    Readonly<StyleExtensionProps>,
) {
  return (
    <AsyncReactSelect<Option, IsMulti, Group>
      {...omit(props, 'className', 'large')}
      styles={selectStyle<Option, IsMulti, Group>(props)}
      className={classNames('react-select', props.className)}
      classNamePrefix="react-select"
      components={{
        ...props.components,
        DropdownIndicator: dropdownIndicator,
        ClearIndicator: clearIndicator,
        MultiValueRemove: multiValueRemove,
        LoadingIndicator: loadingIndicator,
      }}
    />
  );
}

export function selectStyle<
  Option = LabelValueSelectOption,
  IsMulti extends boolean = boolean,
  Group extends GroupBase<Option> = GroupBase<Option>,
>(
  props?: NamedProps<Option, IsMulti, Group> &
    AsyncProps<Option, IsMulti, Group> &
    Readonly<StyleExtensionProps>,
): StylesConfig<Option, IsMulti, Group> {
  return {
    container: () => ({
      position: 'relative',
      display: 'inline-block',
      verticalAlign: 'middle',
      fontSize: '12px',
      textAlign: 'left',
      width: '100%',
    }),
    control: (_provided, state) => ({
      position: 'relative',
      display: 'flex',
      width: '100%',
      minHeight: `${sizes.controlHeight}`,
      lineHeight: `calc(${sizes.controlHeight} - 2px)`,
      border: `1px solid ${state.isFocused ? colors.blue : colors.gray80}`,
      borderCollapse: 'separate',
      borderRadius: '2px',
      backgroundColor: state.isDisabled ? colors.disableGrayBg : '#fff',
      boxSizing: 'border-box',
      color: `${colors.baseFontColor}`,
      cursor: 'default',
      outline: 'none',
      padding: props?.large ? '4px 0px' : '0',
    }),
    singleValue: () => ({
      bottom: 0,
      left: 0,
      lineHeight: '23px',
      padding: props?.large ? '4px 8px' : '0 8px',
      paddingLeft: '8px',
      paddingRight: '24px',
      position: 'absolute',
      right: 0,
      top: 0,
      maxWidth: '100%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }),
    valueContainer: (_provided, state) => {
      if (state.hasValue && state.isMulti) {
        return {
          lineHeight: '23px',
          paddingLeft: '1px',
        };
      }

      return {
        bottom: 0,
        left: 0,
        lineHeight: '23px',
        paddingLeft: '8px',
        paddingRight: '24px',
        position: 'absolute',
        right: 0,
        top: 0,
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        display: 'flex',
      };
    },
    indicatorsContainer: (_provided, state) => ({
      position: 'relative',
      cursor: state.isDisabled ? 'default' : 'pointer',
      textAlign: 'end',
      verticalAlign: 'middle',
      width: '20px',
      paddingRight: '5px',
      flex: 1,
      display: 'flex',
      justifyContent: 'end',
      alignItems: 'center',
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    multiValue: () => ({
      display: 'inline-block',
      backgroundColor: 'rgba(0, 126, 255, 0.08)',
      borderRadius: '2px',
      border: '1px solid rgba(0, 126, 255, 0.24)',
      color: '#333',
      maxWidth: '200px',
      fontSize: '12px',
      lineHeight: '14px',
      margin: '1px 4px 1px 1px',
      verticalAlign: 'top',
    }),
    multiValueLabel: () => ({
      display: 'inline-block',
      cursor: 'default',
      padding: '2px 5px',
      overflow: 'hidden',
      marginRight: 'auto',
      maxWidth: 'calc(200px - 28px)',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      verticalAlign: 'middle',
    }),
    multiValueRemove: () => ({
      order: '-1',
      cursor: 'pointer',
      borderLeft: '1px solid rgba(0, 126, 255, 0.24)',
      verticalAlign: 'middle',
      padding: '1px 5px',
      fontSize: '12px',
      lineHeight: '14px',
      display: 'inline-block',
    }),
    menu: () => ({
      borderBottomRightRadius: '4px',
      borderBottomLeftRadius: '4px',
      backgroundColor: colors.white,
      border: `1px solid ${colors.neutral200}`,
      borderTopColor: `${colors.barBorderColor}`,
      boxSizing: 'border-box',
      marginTop: '-1px',
      maxHeight: '200px',
      zIndex: `${zIndexes.dropdownMenuZIndex}`,
      webkitOverflowScrolling: 'touch',
      boxShadow: `${others.defaultShadow}`,
      position: 'absolute',
      top: '100%',
      minWidth: '100%',
    }),
    menuPortal: (baseStyles) => ({
      ...baseStyles,
      borderBottomRightRadius: '4px',
      borderBottomLeftRadius: '4px',
      marginTop: '-1px',
      backgroundColor: colors.white,
      border: `1px solid ${colors.neutral200}`,
      borderTopColor: `${colors.barBorderColor}`,
      boxSizing: 'border-box',
      maxHeight: '200px',
      zIndex: `${zIndexes.dropdownMenuZIndex}`,
      webkitOverflowScrolling: 'touch',
      boxShadow: `${others.defaultShadow}`,
    }),
    menuList: () => ({
      boxSizing: 'border-box',
      maxHeight: '198px',
      padding: '5px 0',
      overflowY: 'auto',
    }),
    placeholder: () => ({
      position: 'absolute',
      color: '#666',
    }),
    option: (_provided, state) => {
      let borderLeftColor = 'transparent';
      let backgroundColor = colors.white;

      if (state.isFocused && state.isSelected) {
        borderLeftColor = colors.info500;
        backgroundColor = colors.info100;
      } else if (state.isFocused) {
        borderLeftColor = colors.blacka60;
        backgroundColor = colors.neutral50;
      } else if (state.isSelected) {
        borderLeftColor = colors.info500;
        backgroundColor = colors.info50;
      }

      return {
        display: 'block',
        lineHeight: '20px',
        padding: props?.large ? '4px 8px' : '0 8px',
        boxSizing: 'border-box',
        color: state.isDisabled ? colors.disableGrayText : colors.neutral800,
        backgroundColor,
        borderLeft: '2px solid transparent',
        borderLeftColor,
        fontSize: `${sizes.smallFontSize}`,
        cursor: state.isDisabled ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      };
    },
    input: () => ({
      display: 'flex',
      alignItems: 'center',
    }),
    loadingIndicator: () => ({
      position: 'absolute',
      padding: '8px',
      fontSize: '4px',
    }),
    noOptionsMessage: () => ({
      color: `${colors.gray60}`,
      padding: '8px 10px',
    }),
  };
}
