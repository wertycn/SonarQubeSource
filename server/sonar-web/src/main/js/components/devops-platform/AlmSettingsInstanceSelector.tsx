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
import { InputSelect, LabelValueSelectOption } from 'design-system';
import * as React from 'react';
import { OptionProps, SingleValueProps, components } from 'react-select';
import { translate } from '../../helpers/l10n';
import { AlmSettingsInstance } from '../../types/alm-settings';

function optionRenderer(props: OptionProps<LabelValueSelectOption<AlmSettingsInstance>, false>) {
  return <components.Option {...props}>{customOptions(props.data.value)}</components.Option>;
}

function singleValueRenderer(
  props: SingleValueProps<LabelValueSelectOption<AlmSettingsInstance>, false>,
) {
  return (
    <components.SingleValue {...props}>{customOptions(props.data.value)}</components.SingleValue>
  );
}

function customOptions(instance: AlmSettingsInstance) {
  return instance.url ? (
    <>
      <span>{instance.key} — </span>
      <span className="text-muted">{instance.url}</span>
    </>
  ) : (
    <span>{instance.key}</span>
  );
}

function orgToOption(alm: AlmSettingsInstance) {
  return { value: alm, label: alm.key };
}

interface Props {
  instances: AlmSettingsInstance[];
  initialValue?: string;
  onChange: (instance: AlmSettingsInstance) => void;
  className: string;
  inputId: string;
}

export default function AlmSettingsInstanceSelector(props: Props) {
  const { instances, initialValue, className, inputId } = props;

  return (
    <InputSelect
      inputId={inputId}
      className={className}
      isClearable={false}
      isSearchable={false}
      options={instances.map(orgToOption)}
      onChange={(data: LabelValueSelectOption<AlmSettingsInstance>) => {
        props.onChange(data.value);
      }}
      components={{
        Option: optionRenderer,
        SingleValue: singleValueRenderer,
      }}
      placeholder={translate('alm.configuration.selector.placeholder')}
      getOptionValue={(opt: LabelValueSelectOption<AlmSettingsInstance>) => opt.value.key}
      value={instances.map(orgToOption).find((opt) => opt.value.key === initialValue) ?? null}
      size="full"
    />
  );
}
