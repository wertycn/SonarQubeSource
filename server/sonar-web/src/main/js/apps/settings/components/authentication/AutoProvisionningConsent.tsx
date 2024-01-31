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
import * as React from 'react';
import { FormattedMessage } from 'react-intl';
import DocLink from '../../../../components/common/DocLink';
import Modal from '../../../../components/controls/Modal';
import { Button } from '../../../../components/controls/buttons';
import { translate } from '../../../../helpers/l10n';
import { useToggleGithubProvisioningMutation } from '../../../../queries/identity-provider/github';
import { useGetValueQuery, useResetSettingsMutation } from '../../../../queries/settings';

const GITHUB_PERMISSION_USER_CONSENT =
  'sonar.auth.github.userConsentForPermissionProvisioningRequired';

export default function AutoProvisioningConsent() {
  const toggleGithubProvisioning = useToggleGithubProvisioningMutation();
  const resetSettingsMutation = useResetSettingsMutation();
  const { data } = useGetValueQuery(GITHUB_PERMISSION_USER_CONSENT);

  const header = translate('settings.authentication.github.confirm_auto_provisioning.header');

  const removeConsentFlag = () => {
    resetSettingsMutation.mutate([GITHUB_PERMISSION_USER_CONSENT]);
  };

  const switchToJIT = async () => {
    await toggleGithubProvisioning.mutateAsync(false);
    removeConsentFlag();
  };

  const continueWithAuto = async () => {
    await toggleGithubProvisioning.mutateAsync(true);
    removeConsentFlag();
  };

  if (data?.value !== '') {
    return null;
  }

  return (
    <Modal contentLabel={header} shouldCloseOnOverlayClick={false} size="medium">
      <header className="modal-head">
        <h2>{header}</h2>
      </header>
      <div className="modal-body">
        <FormattedMessage
          tagName="p"
          id="settings.authentication.github.confirm_auto_provisioning.description1"
        />
        <FormattedMessage
          id="settings.authentication.github.confirm_auto_provisioning.description2"
          tagName="p"
          values={{
            documentation: (
              <DocLink to="/instance-administration/authentication/github/">
                <FormattedMessage id="documentation" />
              </DocLink>
            ),
          }}
        />
        <FormattedMessage
          tagName="p"
          id="settings.authentication.github.confirm_auto_provisioning.question"
        />
      </div>
      <footer className="modal-foot">
        <Button onClick={continueWithAuto}>
          {translate('settings.authentication.github.confirm_auto_provisioning.continue')}
        </Button>
        <Button onClick={switchToJIT}>
          {translate('settings.authentication.github.confirm_auto_provisioning.switch_jit')}
        </Button>
      </footer>
    </Modal>
  );
}
