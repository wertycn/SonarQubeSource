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
import styled from '@emotion/styled';
import classNames from 'classnames';
import {
  ActionsDropdown,
  HelperHintIcon,
  ItemButton,
  ItemDangerButton,
  ItemDivider,
  PopupZLevel,
  themeBorder,
  themeColor,
} from 'design-system';
import * as React from 'react';
import { WrappedComponentProps, injectIntl } from 'react-intl';
import ClickEventBoundary from '../../../components/controls/ClickEventBoundary';
import Tooltip from '../../../components/controls/Tooltip';
import { formatterOption } from '../../../components/intl/DateTimeFormatter';
import TimeFormatter from '../../../components/intl/TimeFormatter';
import { parseDate } from '../../../helpers/dates';
import { translate, translateWithParameters } from '../../../helpers/l10n';
import { ParsedAnalysis } from '../../../types/project-activity';
import Events from './Events';
import AddEventForm from './forms/AddEventForm';
import RemoveAnalysisForm from './forms/RemoveAnalysisForm';

export interface ProjectActivityAnalysisProps extends WrappedComponentProps {
  onAddCustomEvent: (analysis: string, name: string, category?: string) => Promise<void>;
  onAddVersion: (analysis: string, version: string) => Promise<void>;
  analysis: ParsedAnalysis;
  canAdmin?: boolean;
  canDeleteAnalyses?: boolean;
  canCreateVersion: boolean;
  onChangeEvent: (event: string, name: string) => Promise<void>;
  onDeleteAnalysis: (analysis: string) => Promise<void>;
  onDeleteEvent: (analysis: string, event: string) => Promise<void>;
  isBaseline: boolean;
  isFirst: boolean;
  selected: boolean;
  onUpdateSelectedDate: (date: Date) => void;
}

function ProjectActivityAnalysis(props: ProjectActivityAnalysisProps) {
  let node: HTMLLIElement | null = null;

  const {
    analysis,
    isBaseline,
    isFirst,
    canAdmin,
    canCreateVersion,
    selected,
    intl: { formatDate },
  } = props;

  React.useEffect(() => {
    if (node && selected) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  const [addEventForm, setAddEventForm] = React.useState(false);
  const [addVersionForm, setAddVersionForm] = React.useState(false);
  const [removeAnalysisForm, setRemoveAnalysisForm] = React.useState(false);

  const parsedDate = parseDate(analysis.date);
  const hasVersion = analysis.events.find((event) => event.category === 'VERSION') != null;

  const canAddVersion = canAdmin && !hasVersion && canCreateVersion;
  const canAddEvent = canAdmin;
  const canDeleteAnalyses =
    props.canDeleteAnalyses && !isFirst && !analysis.manualNewCodePeriodBaseline;

  let tooltipContent = <TimeFormatter date={parsedDate} long />;
  if (analysis.buildString) {
    tooltipContent = (
      <>
        {tooltipContent}{' '}
        {translateWithParameters('project_activity.analysis_build_string_X', analysis.buildString)}
      </>
    );
  }

  return (
    <>
      <Tooltip mouseEnterDelay={0.5} overlay={tooltipContent} placement="left">
        <ActivityAnalysisListItem
          className={classNames(
            'it__project-activity-analysis sw-flex sw-cursor-pointer sw-p-1 sw-relative',
            {
              active: selected,
            },
          )}
          aria-label={translateWithParameters(
            'project_activity.show_analysis_X_on_graph',
            analysis.buildString ?? formatDate(parsedDate, formatterOption),
          )}
          onClick={() => props.onUpdateSelectedDate(analysis.date)}
          ref={(ref) => (node = ref)}
        >
          <div className="it__project-activity-time">
            <ActivityTime className="sw-h-page sw-body-sm-highlight sw-text-right sw-mr-2 sw-py-1/2">
              <TimeFormatter date={parsedDate} long={false}>
                {(formattedTime) => (
                  <time dateTime={parsedDate.toISOString()}>{formattedTime}</time>
                )}
              </TimeFormatter>
            </ActivityTime>
          </div>

          {(canAddVersion || canAddEvent || canDeleteAnalyses) && (
            <ClickEventBoundary>
              <div className="sw-h-page sw-grow-0 sw-shrink-0 sw-mr-4 sw-relative">
                <ActionsDropdown
                  ariaLabel={translateWithParameters(
                    'project_activity.analysis_X_actions',
                    analysis.buildString ?? formatDate(parsedDate, formatterOption),
                  )}
                  buttonSize="small"
                  id="it__analysis-actions"
                  zLevel={PopupZLevel.Absolute}
                >
                  {canAddVersion && (
                    <ItemButton className="js-add-version" onClick={() => setAddVersionForm(true)}>
                      {translate('project_activity.add_version')}
                    </ItemButton>
                  )}
                  {canAddEvent && (
                    <ItemButton className="js-add-event" onClick={() => setAddEventForm(true)}>
                      {translate('project_activity.add_custom_event')}
                    </ItemButton>
                  )}
                  {(canAddVersion || canAddEvent) && canDeleteAnalyses && <ItemDivider />}
                  {canDeleteAnalyses && (
                    <ItemDangerButton
                      className="js-delete-analysis"
                      onClick={() => setRemoveAnalysisForm(true)}
                    >
                      {translate('project_activity.delete_analysis')}
                    </ItemDangerButton>
                  )}
                </ActionsDropdown>

                {addVersionForm && (
                  <AddEventForm
                    addEvent={props.onAddVersion}
                    addEventButtonText="project_activity.add_version"
                    analysis={analysis}
                    onClose={() => setAddVersionForm(false)}
                  />
                )}

                {addEventForm && (
                  <AddEventForm
                    addEvent={props.onAddCustomEvent}
                    addEventButtonText="project_activity.add_custom_event"
                    analysis={analysis}
                    onClose={() => setAddEventForm(false)}
                  />
                )}

                {removeAnalysisForm && (
                  <RemoveAnalysisForm
                    analysis={analysis}
                    deleteAnalysis={props.onDeleteAnalysis}
                    onClose={() => setRemoveAnalysisForm(false)}
                  />
                )}
              </div>
            </ClickEventBoundary>
          )}

          {analysis.events.length > 0 && (
            <Events
              analysisKey={analysis.key}
              canAdmin={canAdmin}
              events={analysis.events}
              isFirst={isFirst}
              onChange={props.onChangeEvent}
              onDelete={props.onDeleteEvent}
            />
          )}
        </ActivityAnalysisListItem>
      </Tooltip>
      {isBaseline && (
        <BaselineMarker className="sw-body-sm sw-mt-2">
          <span className="sw-py-1/2 sw-px-1">
            {translate('project_activity.new_code_period_start')}
          </span>
          <Tooltip
            overlay={translate('project_activity.new_code_period_start.help')}
            placement="top"
          >
            <HelperHintIcon className="sw-ml-1" />
          </Tooltip>
        </BaselineMarker>
      )}
    </>
  );
}

const ActivityTime = styled.div`
  box-sizing: border-box;
  width: 4.5rem;
`;

const ActivityAnalysisListItem = styled.li`
  border-bottom: ${themeBorder('default')};
  border-left: ${themeBorder('active', 'transparent')};

  &:first-of-type {
    border-top: ${themeBorder('default')};
  }

  &:focus {
    outline: none;
  }

  &:hover,
  &:focus,
  &.active {
    background-color: ${themeColor('subnavigationHover')};
  }

  &.active {
    border-left: ${themeBorder('active')};
  }
`;

export const BaselineMarker = styled.li`
  display: flex;
  align-items: center;
  border-bottom: ${themeBorder('default', 'newCodeHighlight')};

  & span {
    background-color: ${themeColor('dropdownMenuFocus')};
  }
`;

export default injectIntl(ProjectActivityAnalysis);
