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
import { FlagMessage, Link, Spinner } from 'design-system';
import * as React from 'react';
import { useComponent } from '../../../app/components/componentContext/withComponentContext';
import { translate } from '../../../helpers/l10n';
import { useBranchWarningQuery } from '../../../queries/branch';
import { TaskStatuses } from '../../../types/tasks';
import { Component } from '../../../types/types';
import { AnalysisErrorModal } from './AnalysisErrorModal';
import AnalysisWarningsModal from './AnalysisWarningsModal';

export interface HeaderMetaProps {
  component: Component;
  className?: string;
}

export function AnalysisStatus(props: HeaderMetaProps) {
  const { className, component } = props;
  const { currentTask, isPending, isInProgress } = useComponent();
  const { data: warnings, isLoading } = useBranchWarningQuery(component);

  const [modalIsVisible, setDisplayModal] = React.useState(false);
  const openModal = React.useCallback(() => {
    setDisplayModal(true);
  }, [setDisplayModal]);
  const closeModal = React.useCallback(() => {
    setDisplayModal(false);
  }, [setDisplayModal]);

  if (isInProgress || isPending) {
    return (
      <div data-test="analysis-status" className={classNames('sw-flex sw-items-center', className)}>
        <Spinner />
        <span className="sw-ml-1">
          {isInProgress
            ? translate('project_navigation.analysis_status.in_progress')
            : translate('project_navigation.analysis_status.pending')}
        </span>
      </div>
    );
  }

  if (currentTask?.status === TaskStatuses.Failed) {
    return (
      <>
        <FlagMessage data-test="analysis-status" variant="error" className={className}>
          <span>{translate('project_navigation.analysis_status.failed')}</span>
          <Link className="sw-ml-1" blurAfterClick onClick={openModal} preventDefault to={{}}>
            {translate('project_navigation.analysis_status.details_link')}
          </Link>
        </FlagMessage>
        {modalIsVisible && (
          <AnalysisErrorModal
            component={component}
            currentTask={currentTask}
            onClose={closeModal}
          />
        )}
      </>
    );
  }

  if (!isLoading && warnings && warnings.length > 0) {
    return (
      <>
        <FlagMessage data-test="analysis-status" variant="warning" className={className}>
          <span>{translate('project_navigation.analysis_status.warnings')}</span>
          <Link className="sw-ml-1" blurAfterClick onClick={openModal} preventDefault to={{}}>
            {translate('project_navigation.analysis_status.details_link')}
          </Link>
        </FlagMessage>
        {modalIsVisible && (
          <AnalysisWarningsModal component={component} onClose={closeModal} warnings={warnings} />
        )}
      </>
    );
  }

  return null;
}
