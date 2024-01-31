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
import {
  BasicSeparator,
  LargeCenteredLayout,
  LightGreyCard,
  PageContentFontWrapper,
} from 'design-system';
import * as React from 'react';
import A11ySkipTarget from '../../../components/a11y/A11ySkipTarget';
import { useLocation } from '../../../components/hoc/withRouter';
import { parseDate } from '../../../helpers/dates';
import { isDiffMetric } from '../../../helpers/measures';
import { CodeScope } from '../../../helpers/urls';
import { ApplicationPeriod } from '../../../types/application';
import { Branch } from '../../../types/branch-like';
import { ComponentQualifier } from '../../../types/component';
import { Analysis, GraphType, MeasureHistory } from '../../../types/project-activity';
import { QualityGateStatus } from '../../../types/quality-gates';
import { Component, MeasureEnhanced, Metric, Period, QualityGate } from '../../../types/types';
import { AnalysisStatus } from '../components/AnalysisStatus';
import SonarLintPromotion from '../components/SonarLintPromotion';
import { MeasuresTabs } from '../utils';
import AcceptedIssuesPanel from './AcceptedIssuesPanel';
import ActivityPanel from './ActivityPanel';
import BranchMetaTopBar from './BranchMetaTopBar';
import FirstAnalysisNextStepsNotif from './FirstAnalysisNextStepsNotif';
import { MeasuresPanel } from './MeasuresPanel';
import MeasuresPanelNoNewCode from './MeasuresPanelNoNewCode';
import NewCodeMeasuresPanel from './NewCodeMeasuresPanel';
import NoCodeWarning from './NoCodeWarning';
import QualityGatePanel from './QualityGatePanel';
import { TabsPanel } from './TabsPanel';

export interface BranchOverviewRendererProps {
  analyses?: Analysis[];
  appLeak?: ApplicationPeriod;
  branch?: Branch;
  branchesEnabled?: boolean;
  component: Component;
  detectedCIOnLastAnalysis?: boolean;
  graph?: GraphType;
  loadingHistory?: boolean;
  loadingStatus?: boolean;
  measures?: MeasureEnhanced[];
  measuresHistory?: MeasureHistory[];
  metrics?: Metric[];
  onGraphChange: (graph: GraphType) => void;
  period?: Period;
  projectIsEmpty?: boolean;
  qgStatuses?: QualityGateStatus[];
  qualityGate?: QualityGate;
}

export default function BranchOverviewRenderer(props: BranchOverviewRendererProps) {
  const {
    analyses,
    appLeak,
    branch,
    branchesEnabled,
    component,
    detectedCIOnLastAnalysis,
    graph,
    loadingHistory,
    loadingStatus,
    measures = [],
    measuresHistory = [],
    metrics = [],
    onGraphChange,
    period,
    projectIsEmpty,
    qgStatuses,
    qualityGate,
  } = props;

  const { query } = useLocation();
  const [tab, selectTab] = React.useState(() => {
    return query.codeScope === CodeScope.Overall ? MeasuresTabs.Overall : MeasuresTabs.New;
  });

  const leakPeriod = component.qualifier === ComponentQualifier.Application ? appLeak : period;
  const isNewCodeTab = tab === MeasuresTabs.New;
  const hasNewCodeMeasures = measures.some((m) => isDiffMetric(m.metric.key));

  React.useEffect(() => {
    // Open Overall tab by default if there are no new measures.
    if (loadingStatus === false && !hasNewCodeMeasures && isNewCodeTab) {
      selectTab(MeasuresTabs.Overall);
    }
    // In this case, we explicitly do NOT want to mark tab as a dependency, as
    // it would prevent the user from selecting it, even if it's empty.
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [loadingStatus, hasNewCodeMeasures]);

  return (
    <>
      <FirstAnalysisNextStepsNotif
        component={component}
        branchesEnabled={branchesEnabled}
        detectedCIOnLastAnalysis={detectedCIOnLastAnalysis}
      />
      <LargeCenteredLayout>
        <PageContentFontWrapper>
          <div className="overview sw-my-6 sw-body-sm">
            <A11ySkipTarget anchor="overview_main" />

            {projectIsEmpty ? (
              <NoCodeWarning branchLike={branch} component={component} measures={measures} />
            ) : (
              <div>
                {branch && (
                  <>
                    <BranchMetaTopBar branch={branch} component={component} measures={measures} />
                    <BasicSeparator />
                  </>
                )}
                <AnalysisStatus className="sw-mt-6" component={component} />
                <div className="sw-flex sw-mt-6">
                  <div className="sw-w-1/4 sw-mr-3">
                    <LightGreyCard className="sw-h-max">
                      <QualityGatePanel
                        component={component}
                        loading={loadingStatus}
                        qgStatuses={qgStatuses}
                        qualityGate={qualityGate}
                      />
                    </LightGreyCard>
                    <SonarLintPromotion
                      qgConditions={qgStatuses?.flatMap((qg) => qg.failedConditions)}
                    />
                  </div>

                  <LightGreyCard className="sw-flex-1">
                    <div className="sw-flex sw-flex-col">
                      <TabsPanel
                        analyses={analyses}
                        appLeak={appLeak}
                        component={component}
                        loading={loadingStatus}
                        period={period}
                        branch={branch}
                        qgStatuses={qgStatuses}
                        isNewCode={isNewCodeTab}
                        onTabSelect={selectTab}
                      >
                        {!hasNewCodeMeasures && isNewCodeTab && (
                          <MeasuresPanelNoNewCode
                            branch={branch}
                            component={component}
                            period={period}
                          />
                        )}

                        {hasNewCodeMeasures && isNewCodeTab && (
                          <NewCodeMeasuresPanel
                            qgStatuses={qgStatuses}
                            branch={branch}
                            component={component}
                            measures={measures}
                          />
                        )}

                        {!isNewCodeTab && (
                          <>
                            <MeasuresPanel
                              branch={branch}
                              component={component}
                              measures={measures}
                              isNewCode={isNewCodeTab}
                            />

                            <AcceptedIssuesPanel
                              branch={branch}
                              component={component}
                              measures={measures}
                              isNewCode={isNewCodeTab}
                              loading={loadingStatus}
                            />
                          </>
                        )}
                      </TabsPanel>

                      <ActivityPanel
                        analyses={analyses}
                        branchLike={branch}
                        component={component}
                        graph={graph}
                        leakPeriodDate={leakPeriod && parseDate(leakPeriod.date)}
                        loading={loadingHistory}
                        measuresHistory={measuresHistory}
                        metrics={metrics}
                        onGraphChange={onGraphChange}
                      />
                    </div>
                  </LightGreyCard>
                </div>
              </div>
            )}
          </div>
        </PageContentFontWrapper>
      </LargeCenteredLayout>
    </>
  );
}
