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
import { Spinner } from 'design-system';
import { omitBy } from 'lodash';
import React, { FormEvent, useContext } from 'react';
import { FormattedMessage } from 'react-intl';
import GitLabSynchronisationWarning from '../../../../app/components/GitLabSynchronisationWarning';
import { AvailableFeaturesContext } from '../../../../app/components/available-features/AvailableFeaturesContext';
import DocumentationLink from '../../../../components/common/DocumentationLink';
import ConfirmModal from '../../../../components/controls/ConfirmModal';
import { translate, translateWithParameters } from '../../../../helpers/l10n';
import { useIdentityProviderQuery } from '../../../../queries/identity-provider/common';
import {
  useDeleteGitLabConfigurationMutation,
  useGitLabConfigurationsQuery,
  useSyncWithGitLabNow,
  useUpdateGitLabConfigurationMutation,
} from '../../../../queries/identity-provider/gitlab';
import { AlmKeys } from '../../../../types/alm-settings';
import { Feature } from '../../../../types/features';
import { GitLabConfigurationUpdateBody, ProvisioningType } from '../../../../types/provisioning';
import { DefinitionV2, SettingType } from '../../../../types/settings';
import { Provider } from '../../../../types/types';
import { DOCUMENTATION_LINK_SUFFIXES } from './Authentication';
import AuthenticationFormField from './AuthenticationFormField';
import ConfigurationDetails from './ConfigurationDetails';
import GitLabConfigurationForm from './GitLabConfigurationForm';
import GitLabConfigurationValidity from './GitLabConfigurationValidity';
import ProvisioningSection from './ProvisioningSection';
import TabHeader from './TabHeader';

interface ChangesForm {
  provisioningType?: GitLabConfigurationUpdateBody['provisioningType'];
  allowUsersToSignUp?: GitLabConfigurationUpdateBody['allowUsersToSignUp'];
  provisioningToken?: GitLabConfigurationUpdateBody['provisioningToken'];
}

const definitions: Record<keyof Omit<ChangesForm, 'provisioningType'>, DefinitionV2> = {
  allowUsersToSignUp: {
    name: translate('settings.authentication.gitlab.form.allowUsersToSignUp.name'),
    secured: false,
    key: 'allowUsersToSignUp',
    description: translate('settings.authentication.gitlab.form.allowUsersToSignUp.description'),
    type: SettingType.BOOLEAN,
  },
  provisioningToken: {
    name: translate('settings.authentication.gitlab.form.provisioningToken.name'),
    secured: true,
    key: 'provisioningToken',
    description: translate('settings.authentication.gitlab.form.provisioningToken.description'),
  },
};

export default function GitLabAuthenticationTab() {
  const [openForm, setOpenForm] = React.useState(false);
  const [changes, setChanges] = React.useState<ChangesForm | undefined>(undefined);
  const [tokenKey, setTokenKey] = React.useState<number>(0);
  const [showConfirmProvisioningModal, setShowConfirmProvisioningModal] = React.useState(false);

  const hasGitlabProvisioningFeature = useContext(AvailableFeaturesContext).includes(
    Feature.GitlabProvisioning,
  );

  const { data: identityProvider } = useIdentityProviderQuery();
  const {
    data: list,
    isLoading: isLoadingList,
    isFetching,
    refetch,
  } = useGitLabConfigurationsQuery();
  const configuration = list?.gitlabConfigurations[0];

  const { canSyncNow, synchronizeNow } = useSyncWithGitLabNow();

  const { mutate: updateConfig, isLoading: isUpdating } = useUpdateGitLabConfigurationMutation();
  const { mutate: deleteConfig, isLoading: isDeleting } = useDeleteGitLabConfigurationMutation();

  const toggleEnable = () => {
    if (!configuration) {
      return;
    }
    updateConfig({ id: configuration.id, data: { enabled: !configuration.enabled } });
  };

  const deleteConfiguration = () => {
    if (!configuration) {
      return;
    }
    deleteConfig(configuration.id);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (changes?.provisioningType !== undefined) {
      setShowConfirmProvisioningModal(true);
    } else {
      updateProvisioning();
    }
  };

  const updateProvisioning = () => {
    if (!changes || !configuration) {
      return;
    }

    updateConfig(
      { id: configuration.id, data: omitBy(changes, (value) => value === undefined) },
      {
        onSuccess: () => {
          setChanges(undefined);
          setTokenKey(tokenKey + 1);
        },
      },
    );
  };

  const setJIT = () =>
    setChangesWithCheck({
      provisioningType: ProvisioningType.jit,
      provisioningToken: undefined,
    });

  const setAuto = () =>
    setChangesWithCheck({
      provisioningType: ProvisioningType.auto,
      allowUsersToSignUp: undefined,
    });

  const hasDifferentProvider =
    identityProvider?.provider !== undefined && identityProvider.provider !== Provider.Gitlab;
  const allowUsersToSignUpDefinition = definitions.allowUsersToSignUp;
  const provisioningTokenDefinition = definitions.provisioningToken;

  const provisioningType = changes?.provisioningType ?? configuration?.provisioningType;
  const allowUsersToSignUp = changes?.allowUsersToSignUp ?? configuration?.allowUsersToSignUp;
  const provisioningToken = changes?.provisioningToken;

  const canSave = () => {
    if (!configuration || changes === undefined || isUpdating) {
      return false;
    }
    const type = changes.provisioningType ?? configuration.provisioningType;
    if (type === ProvisioningType.auto) {
      return configuration.isProvisioningTokenSet || !!changes.provisioningToken;
    }
    return true;
  };

  const setChangesWithCheck = (newChanges: ChangesForm) => {
    const newValue = {
      provisioningType:
        configuration?.provisioningType === newChanges.provisioningType
          ? undefined
          : newChanges.provisioningType,
      allowUsersToSignUp:
        configuration?.allowUsersToSignUp === newChanges.allowUsersToSignUp
          ? undefined
          : newChanges.allowUsersToSignUp,
      provisioningToken: newChanges.provisioningToken,
    };
    if (Object.values(newValue).some((v) => v !== undefined)) {
      setChanges(newValue);
    } else {
      setChanges(undefined);
    }
  };

  return (
    <Spinner loading={isLoadingList}>
      <div>
        <TabHeader
          title={translate('settings.authentication.gitlab.configuration')}
          showCreate={!configuration}
          onCreate={() => setOpenForm(true)}
          configurationValidity={
            <>
              {!isLoadingList && configuration?.enabled && (
                <GitLabConfigurationValidity
                  configuration={configuration}
                  loading={isFetching}
                  onRecheck={refetch}
                />
              )}
            </>
          }
        />
        {!configuration && (
          <div>{translate('settings.authentication.gitlab.form.not_configured')}</div>
        )}
        {configuration && (
          <>
            <ConfigurationDetails
              title={translateWithParameters(
                'settings.authentication.gitlab.applicationId.name',
                configuration.applicationId,
              )}
              url={configuration.url}
              canDisable={!isUpdating && configuration.provisioningType !== ProvisioningType.auto}
              enabled={configuration.enabled}
              isDeleting={isDeleting}
              onEdit={() => setOpenForm(true)}
              onDelete={deleteConfiguration}
              onToggle={toggleEnable}
            />
            <ProvisioningSection
              provisioningType={provisioningType ?? ProvisioningType.jit}
              onChangeProvisioningType={(val: ProvisioningType) =>
                val === ProvisioningType.auto ? setAuto() : setJIT()
              }
              disabledConfigText={translate('settings.authentication.gitlab.enable_first')}
              enabled={configuration.enabled}
              hasUnsavedChanges={changes !== undefined}
              canSave={canSave()}
              onSave={handleSubmit}
              onCancel={() => {
                setChanges(undefined);
                setTokenKey(tokenKey + 1);
              }}
              jitTitle={translate('settings.authentication.gitlab.provisioning_at_login')}
              jitDescription={
                <FormattedMessage
                  id="settings.authentication.gitlab.provisioning_at_login.description"
                  values={{
                    documentation: (
                      <DocumentationLink
                        to={`/instance-administration/authentication/${
                          DOCUMENTATION_LINK_SUFFIXES[AlmKeys.GitLab]
                        }/#choosing-the-provisioning-method`}
                      >
                        {translate(`learn_more`)}
                      </DocumentationLink>
                    ),
                  }}
                />
              }
              jitSettings={
                <AuthenticationFormField
                  settingValue={allowUsersToSignUp}
                  definition={allowUsersToSignUpDefinition}
                  mandatory
                  onFieldChange={(_, value) =>
                    setChangesWithCheck({
                      ...changes,
                      allowUsersToSignUp: value as boolean,
                    })
                  }
                  isNotSet={configuration.provisioningType !== ProvisioningType.auto}
                />
              }
              autoTitle={translate('settings.authentication.gitlab.form.provisioning_with_gitlab')}
              hasDifferentProvider={hasDifferentProvider}
              hasFeatureEnabled={hasGitlabProvisioningFeature}
              autoFeatureDisabledText={
                <FormattedMessage
                  id="settings.authentication.gitlab.form.provisioning.disabled"
                  defaultMessage={translate(
                    'settings.authentication.gitlab.form.provisioning.disabled',
                  )}
                  values={{
                    documentation: (
                      <DocumentationLink to="/instance-administration/authentication/gitlab">
                        {translate('documentation')}
                      </DocumentationLink>
                    ),
                  }}
                />
              }
              autoDescription={
                <FormattedMessage
                  id="settings.authentication.gitlab.form.provisioning_with_gitlab.description"
                  values={{
                    documentation: (
                      <DocumentationLink
                        to={`/instance-administration/authentication/${
                          DOCUMENTATION_LINK_SUFFIXES[AlmKeys.GitLab]
                        }/#choosing-the-provisioning-method`}
                      >
                        {translate(`learn_more`)}
                      </DocumentationLink>
                    ),
                  }}
                />
              }
              onSyncNow={synchronizeNow}
              canSync={canSyncNow}
              synchronizationDetails={<GitLabSynchronisationWarning />}
              autoSettings={
                <AuthenticationFormField
                  settingValue={provisioningToken}
                  key={tokenKey}
                  definition={provisioningTokenDefinition}
                  mandatory
                  onFieldChange={(_, value) =>
                    setChangesWithCheck({
                      ...changes,
                      provisioningToken: value as string,
                    })
                  }
                  isNotSet={!configuration.isProvisioningTokenSet}
                />
              }
            />
          </>
        )}
      </div>
      {showConfirmProvisioningModal && provisioningType && (
        <ConfirmModal
          onConfirm={updateProvisioning}
          header={translate('settings.authentication.gitlab.confirm', provisioningType)}
          onClose={() => setShowConfirmProvisioningModal(false)}
          confirmButtonText={translate(
            'settings.authentication.gitlab.provisioning_change.confirm_changes',
          )}
        >
          {translate('settings.authentication.gitlab.confirm', provisioningType, 'description')}
        </ConfirmModal>
      )}
      {openForm && (
        <GitLabConfigurationForm data={configuration ?? null} onClose={() => setOpenForm(false)} />
      )}
    </Spinner>
  );
}
