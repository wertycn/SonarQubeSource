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
import { translate } from '../../helpers/l10n';
import { ButtonIcon } from '../controls/buttons';
import ClearIcon from '../icons/ClearIcon';
import { Alert, AlertProps } from './Alert';

export interface DismissableAlertComponentProps extends AlertProps {
  bannerClassName?: string;
  className?: string;
  children: React.ReactNode;
  onDismiss: () => void;
}

export default function DismissableAlertComponent(props: DismissableAlertComponentProps) {
  const { bannerClassName, className, display = 'banner', variant, children, onDismiss } = props;

  return (
    <div className={classNames('dismissable-alert-wrapper', className)}>
      <Alert
        className={classNames(`dismissable-alert-${display}`, bannerClassName)}
        display={display}
        variant={variant}
      >
        <div className="display-flex-center dismissable-alert-content">
          <div className="flex-1">{children}</div>
          <ButtonIcon aria-label={translate('alert.dismiss')} onClick={onDismiss}>
            <ClearIcon size={12} thin />
          </ButtonIcon>
        </div>
      </Alert>
    </div>
  );
}
