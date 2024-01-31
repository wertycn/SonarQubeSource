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
import { Helmet } from 'react-helmet-async';
import withAvailableFeatures, {
  WithAvailableFeaturesProps,
} from '../../../app/components/available-features/withAvailableFeatures';
import withComponentContext from '../../../app/components/componentContext/withComponentContext';
import Suggestions from '../../../components/embed-docs-modal/Suggestions';
import { isPullRequest } from '../../../helpers/branch-like';
import { translate } from '../../../helpers/l10n';
import { useBranchesQuery } from '../../../queries/branch';
import { isPortfolioLike } from '../../../types/component';
import { Feature } from '../../../types/features';
import { Component } from '../../../types/types';
import BranchOverview from '../branches/BranchOverview';
import PullRequestOverview from '../pullRequests/PullRequestOverview';
import EmptyOverview from './EmptyOverview';

interface AppProps extends WithAvailableFeaturesProps {
  component: Component;
}

export function App(props: AppProps) {
  const { component } = props;
  const branchSupportEnabled = props.hasFeature(Feature.BranchSupport);
  const { data } = useBranchesQuery(component);

  if (isPortfolioLike(component.qualifier) || !data) {
    return null;
  }

  const { branchLike, branchLikes } = data;

  return (
    <>
      <Helmet defer={false} title={translate('overview.page')} />
      {isPullRequest(branchLike) ? (
        <main>
          <Suggestions suggestions="pull_requests" />
          <PullRequestOverview pullRequest={branchLike} component={component} />
        </main>
      ) : (
        <main>
          <Suggestions suggestions="overview" />

          {!component.analysisDate && (
            <EmptyOverview
              branchLike={branchLike}
              branchLikes={branchLikes}
              component={component}
            />
          )}

          {component.analysisDate && (
            <BranchOverview
              branch={branchLike}
              branchesEnabled={branchSupportEnabled}
              component={component}
            />
          )}
        </main>
      )}
    </>
  );
}

export default withComponentContext(withAvailableFeatures(App));
