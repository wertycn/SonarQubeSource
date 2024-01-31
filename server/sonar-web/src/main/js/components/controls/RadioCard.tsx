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
import { FormattedMessage } from 'react-intl';
import { KeyboardKeys } from '../../helpers/keycodes';
import { translate } from '../../helpers/l10n';
import RecommendedIcon from '../icons/RecommendedIcon';
import './Radio.css';
import './RadioCard.css';

export interface RadioCardProps {
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  selected?: boolean;
  noRadio?: boolean;
}

interface Props extends RadioCardProps {
  children: React.ReactNode;
  recommended?: string;
  title: React.ReactNode;
  titleInfo?: React.ReactNode;
  vertical?: boolean;
  label?: string;
}

export default function RadioCard(props: Props) {
  const {
    className,
    disabled,
    onClick,
    recommended,
    selected,
    titleInfo,
    label,
    vertical = false,
    noRadio = false,
  } = props;
  const isActionable = Boolean(onClick);
  const clickHandler = isActionable && !disabled && !selected ? onClick : undefined;

  const keyPressHandler = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.code === KeyboardKeys.Enter) {
      clickHandler?.();
    }
  };

  return (
    <div
      aria-checked={selected}
      className={classNames(
        'radio-card',
        {
          'radio-card-actionable': isActionable,
          'radio-card-vertical': vertical,
          disabled,
          selected,
        },
        className,
      )}
      onClick={clickHandler}
      onKeyPress={keyPressHandler}
      role="radio"
      aria-label={label}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
    >
      <h2 className="radio-card-header big-spacer-bottom">
        <span className="display-flex-center link-radio">
          {isActionable && !noRadio && (
            <i className={classNames('icon-radio', 'spacer-right', { 'is-checked': selected })} />
          )}
          {props.title}
        </span>
        {titleInfo}
      </h2>
      <div className="radio-card-body">{props.children}</div>
      {recommended && (
        <div className="radio-card-recommended">
          <RecommendedIcon className="spacer-right" />
          <FormattedMessage
            defaultMessage={recommended}
            id={recommended}
            values={{ recommended: <strong>{translate('recommended')}</strong> }}
          />
        </div>
      )}
    </div>
  );
}
