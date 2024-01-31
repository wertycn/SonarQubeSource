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
import classNames from 'classnames';
import * as React from 'react';
import CheckIcon from '../icons/CheckIcon';
import { Button } from './buttons';
import './Toggle.css';

interface Props {
  id?: string;
  ariaLabel?: string;
  disabled?: boolean;
  name?: string;
  onChange?: (value: boolean) => void;
  value: boolean | string;
}

export function getToggleValue(value: string | boolean) {
  return typeof value === 'string' ? value === 'true' : value;
}

export default class Toggle extends React.PureComponent<Props> {
  getValue = () => {
    const { value } = this.props;
    return getToggleValue(value);
  };

  handleClick = () => {
    if (this.props.onChange) {
      const value = this.getValue();
      this.props.onChange(!value);
    }
  };

  render() {
    const { ariaLabel, disabled, name, id } = this.props;
    const value = this.getValue();
    const className = classNames('boolean-toggle', { 'boolean-toggle-on': value });

    return (
      <Button
        id={id}
        className={className}
        disabled={disabled}
        aria-label={ariaLabel}
        name={name}
        onClick={this.handleClick}
        role="switch"
        aria-checked={value}
      >
        <div className="boolean-toggle-handle">
          <CheckIcon size={12} />
        </div>
      </Button>
    );
  }
}
