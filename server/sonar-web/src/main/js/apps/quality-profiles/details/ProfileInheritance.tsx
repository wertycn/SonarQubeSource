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
import { ButtonSecondary, FlagMessage, Spinner, SubTitle, Table } from 'design-system';
import * as React from 'react';
import { translate } from '../../../helpers/l10n';
import { useProfileInheritanceQuery } from '../../../queries/quality-profiles';
import { Profile } from '../types';
import ChangeParentForm from './ChangeParentForm';
import ProfileInheritanceRow from './ProfileInheritanceRow';

interface Props {
  profile: Profile;
  profiles: Profile[];
  updateProfiles: () => Promise<void>;
}

export default function ProfileInheritance(props: Readonly<Props>) {
  const { profile, profiles, updateProfiles } = props;
  const [formOpen, setFormOpen] = React.useState(false);

  const { data: { ancestors, children, profile: profileInheritanceDetail } = {}, isLoading } =
    useProfileInheritanceQuery(profile);

  const handleChangeParentClick = React.useCallback(() => {
    setFormOpen(true);
  }, [setFormOpen]);

  const closeForm = React.useCallback(() => {
    setFormOpen(false);
  }, [setFormOpen]);

  const handleParentChange = React.useCallback(async () => {
    try {
      await updateProfiles();
    } finally {
      closeForm();
    }
  }, [closeForm, updateProfiles]);

  const highlightCurrent =
    !isLoading &&
    ancestors != null &&
    children != null &&
    (ancestors.length > 0 || children.length > 0);

  const extendsBuiltIn = ancestors?.some((p) => p.isBuiltIn);

  return (
    <section
      aria-label={translate('quality_profiles.profile_inheritance')}
      className="it__quality-profiles__inheritance"
    >
      <div className="sw-flex sw-items-center sw-gap-3 sw-mb-6">
        <SubTitle className="sw-mb-0">{translate('quality_profiles.profile_inheritance')}</SubTitle>
        {profile.actions?.edit && !profile.isBuiltIn && (
          <ButtonSecondary
            className="it__quality-profiles__change-parent"
            onClick={handleChangeParentClick}
          >
            {translate('quality_profiles.change_parent')}
          </ButtonSecondary>
        )}
      </div>

      {!extendsBuiltIn && !profile.isBuiltIn && (
        <FlagMessage variant="info" className="sw-mb-4">
          <div className="sw-flex sw-flex-col">
            {translate('quality_profiles.no_built_in_updates_warning')}
            {profile.actions?.edit && (
              <span className="sw-mt-1">
                {translate('quality_profiles.no_built_in_updates_warning_admin')}
              </span>
            )}
          </div>
        </FlagMessage>
      )}

      <Spinner loading={isLoading}>
        <Table columnCount={3} noSidePadding>
          {ancestors?.map((ancestor, index) => (
            <ProfileInheritanceRow
              depth={index}
              key={ancestor.key}
              language={profile.language}
              profile={ancestor}
              type="ancestor"
            />
          ))}

          {profileInheritanceDetail && (
            <ProfileInheritanceRow
              className={classNames({
                selected: highlightCurrent,
              })}
              depth={ancestors ? ancestors.length : 0}
              displayLink={false}
              language={profile.language}
              profile={profileInheritanceDetail}
            />
          )}

          {children?.map((child) => (
            <ProfileInheritanceRow
              depth={ancestors ? ancestors.length + 1 : 0}
              key={child.key}
              language={profile.language}
              profile={child}
              type="child"
            />
          ))}
        </Table>
      </Spinner>

      {formOpen && (
        <ChangeParentForm
          onChange={handleParentChange}
          onClose={closeForm}
          profile={profile}
          profiles={profiles.filter(
            (p) => p.key !== profileInheritanceDetail?.key && p.language === profile.language,
          )}
        />
      )}
    </section>
  );
}
