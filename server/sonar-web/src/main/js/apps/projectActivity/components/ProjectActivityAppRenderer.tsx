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
import {
  LargeCenteredLayout,
  PageContentFontWrapper,
  themeBorder,
  themeColor,
} from 'design-system';
import * as React from 'react';
import { Helmet } from 'react-helmet-async';
import A11ySkipTarget from '../../../components/a11y/A11ySkipTarget';
import Suggestions from '../../../components/embed-docs-modal/Suggestions';
import { parseDate } from '../../../helpers/dates';
import { translate } from '../../../helpers/l10n';
import { ComponentQualifier } from '../../../types/component';
import { MeasureHistory, ParsedAnalysis } from '../../../types/project-activity';
import { Component, Metric } from '../../../types/types';
import { Query } from '../utils';
import ProjectActivityAnalysesList from './ProjectActivityAnalysesList';
import ProjectActivityGraphs from './ProjectActivityGraphs';
import ProjectActivityPageFilters from './ProjectActivityPageFilters';

interface Props {
  onAddCustomEvent: (analysis: string, name: string, category?: string) => Promise<void>;
  onAddVersion: (analysis: string, version: string) => Promise<void>;
  analyses: ParsedAnalysis[];
  analysesLoading: boolean;
  onChangeEvent: (event: string, name: string) => Promise<void>;
  onDeleteAnalysis: (analysis: string) => Promise<void>;
  onDeleteEvent: (analysis: string, event: string) => Promise<void>;
  graphLoading: boolean;
  leakPeriodDate?: Date;
  initializing: boolean;
  project: Pick<Component, 'configuration' | 'key' | 'leakPeriodDate' | 'qualifier'>;
  metrics: Metric[];
  measuresHistory: MeasureHistory[];
  query: Query;
  onUpdateQuery: (changes: Partial<Query>) => void;
}

export default function ProjectActivityAppRenderer(props: Props) {
  const { analyses, measuresHistory, query } = props;
  const { configuration } = props.project;
  const canAdmin =
    (props.project.qualifier === ComponentQualifier.Project ||
      props.project.qualifier === ComponentQualifier.Application) &&
    (configuration ? configuration.showHistory : false);
  const canDeleteAnalyses = configuration ? configuration.showHistory : false;
  const leakPeriodDate = props.leakPeriodDate ? parseDate(props.leakPeriodDate) : undefined;
  return (
    <main className="sw-p-5" id="project-activity">
      <Suggestions suggestions="project_activity" />
      <Helmet defer={false} title={translate('project_activity.page')} />

      <A11ySkipTarget anchor="activity_main" />
      <LargeCenteredLayout>
        <PageContentFontWrapper>
          <ProjectActivityPageFilters
            category={query.category}
            from={query.from}
            project={props.project}
            to={query.to}
            updateQuery={props.onUpdateQuery}
          />

          <div className="sw-grid sw-grid-cols-12 sw-gap-x-12">
            <StyledWrapper className="sw-col-span-4 sw-rounded-1">
              <ProjectActivityAnalysesList
                onAddCustomEvent={props.onAddCustomEvent}
                onAddVersion={props.onAddVersion}
                analyses={analyses}
                analysesLoading={props.analysesLoading}
                canAdmin={canAdmin}
                canDeleteAnalyses={canDeleteAnalyses}
                onChangeEvent={props.onChangeEvent}
                onDeleteAnalysis={props.onDeleteAnalysis}
                onDeleteEvent={props.onDeleteEvent}
                initializing={props.initializing}
                leakPeriodDate={leakPeriodDate}
                project={props.project}
                query={query}
                onUpdateQuery={props.onUpdateQuery}
              />
            </StyledWrapper>
            <StyledWrapper className="sw-col-span-8 sw-rounded-1">
              <ProjectActivityGraphs
                analyses={analyses}
                leakPeriodDate={leakPeriodDate}
                loading={props.graphLoading}
                measuresHistory={measuresHistory}
                metrics={props.metrics}
                project={props.project.key}
                query={query}
                updateQuery={props.onUpdateQuery}
              />
            </StyledWrapper>
          </div>
        </PageContentFontWrapper>
      </LargeCenteredLayout>
    </main>
  );
}

const StyledWrapper = styled.div`
  border: ${themeBorder('default', 'filterbarBorder')};
  background-color: ${themeColor('backgroundSecondary')};
`;
