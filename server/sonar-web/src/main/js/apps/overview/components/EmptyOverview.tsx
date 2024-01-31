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
import { FlagMessage, LargeCenteredLayout, PageContentFontWrapper, Spinner } from 'design-system';
import * as React from 'react';
import { Navigate } from 'react-router-dom';
import withCurrentUserContext from '../../../app/components/current-user/withCurrentUserContext';
import { getBranchLikeDisplayName, isBranch, isMainBranch } from '../../../helpers/branch-like';
import { translate, translateWithParameters } from '../../../helpers/l10n';
import { getProjectTutorialLocation } from '../../../helpers/urls';
import { useTaskForComponentQuery } from '../../../queries/component';
import { BranchLike } from '../../../types/branch-like';
import { ComponentQualifier } from '../../../types/component';
import { TaskTypes } from '../../../types/tasks';
import { Component } from '../../../types/types';
import { CurrentUser, isLoggedIn } from '../../../types/users';

export interface EmptyOverviewProps {
  branchLike?: BranchLike;
  branchLikes: BranchLike[];
  component: Component;
  currentUser: CurrentUser;
}

export function EmptyOverview(props: EmptyOverviewProps) {
  const { branchLike, branchLikes, component, currentUser } = props;
  const { data, isLoading } = useTaskForComponentQuery(component);
  const hasQueuedAnalyses =
    data && data.queue.filter((task) => task.type === TaskTypes.Report).length > 0;
  const hasPermissionSyncInProgess =
    data &&
    data.queue.filter((task) => task.type === TaskTypes.GithubProjectPermissionsProvisioning)
      .length > 0;

  if (isLoading) {
    return <Spinner loading />;
  }

  if (component.qualifier === ComponentQualifier.Application) {
    return (
      <LargeCenteredLayout className="sw-pt-8">
        <FlagMessage className="sw-w-full" variant="warning">
          {translate('provisioning.no_analysis.application')}
        </FlagMessage>
      </LargeCenteredLayout>
    );
  } else if (!isBranch(branchLike)) {
    return null;
  }

  const hasBranches = branchLikes.length > 1;
  const hasBadBranchConfig =
    branchLikes.length > 2 ||
    (branchLikes.length === 2 && branchLikes.some((branch) => isBranch(branch)));

  if (hasPermissionSyncInProgess) {
    return (
      <LargeCenteredLayout className="sw-pt-8">
        <PageContentFontWrapper>
          <FlagMessage variant="warning">
            {translate('provisioning.permission_synch_in_progress')}
            <Spinner className="sw-ml-8 sw-hidden" aria-hidden loading />
          </FlagMessage>
        </PageContentFontWrapper>
      </LargeCenteredLayout>
    );
  }

  const showTutorial = isMainBranch(branchLike) && !hasBranches && !hasQueuedAnalyses;

  if (showTutorial && isLoggedIn(currentUser)) {
    return <Navigate replace to={getProjectTutorialLocation(component.key)} />;
  }

  let warning;
  if (isLoggedIn(currentUser) && isMainBranch(branchLike) && hasBranches && hasBadBranchConfig) {
    warning = translateWithParameters(
      'provisioning.no_analysis_on_main_branch.bad_configuration',
      getBranchLikeDisplayName(branchLike),
      translate('branches.main_branch'),
    );
  } else {
    warning = translateWithParameters(
      'provisioning.no_analysis_on_main_branch',
      getBranchLikeDisplayName(branchLike),
    );
  }

  return (
    <LargeCenteredLayout className="sw-pt-8">
      <PageContentFontWrapper>
        {isLoggedIn(currentUser) ? (
          <>
            {hasBranches && (
              <FlagMessage className="sw-w-full" variant="warning">
                {warning}
              </FlagMessage>
            )}
          </>
        ) : (
          <FlagMessage className="sw-w-full" variant="warning">
            {warning}
          </FlagMessage>
        )}
      </PageContentFontWrapper>
    </LargeCenteredLayout>
  );
}

export default withCurrentUserContext(EmptyOverview);
