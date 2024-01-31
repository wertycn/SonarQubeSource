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
import { Highlight, Link, MetricsLabel, MetricsRatingBadge } from 'design-system';
import * as React from 'react';
import LanguageDistribution from '../../../components/charts/LanguageDistribution';
import Tooltip from '../../../components/controls/Tooltip';
import Measure from '../../../components/measure/Measure';
import { getLocalizedMetricName, translate, translateWithParameters } from '../../../helpers/l10n';
import { formatMeasure, isDiffMetric } from '../../../helpers/measures';
import { getMeasureHistoryUrl } from '../../../helpers/urls';
import { BranchLike } from '../../../types/branch-like';
import { ComponentQualifier } from '../../../types/component';
import { MetricKey, MetricType } from '../../../types/metrics';
import { ComponentMeasure, Metric, Period, Measure as TypeMeasure } from '../../../types/types';
import { hasFullMeasures } from '../utils';
import LeakPeriodLegend from './LeakPeriodLegend';

interface Props {
  branchLike?: BranchLike;
  component: ComponentMeasure;
  leakPeriod?: Period;
  measureValue?: string;
  metric: Metric;
  secondaryMeasure?: TypeMeasure;
}

export default function MeasureHeader(props: Props) {
  const { branchLike, component, leakPeriod, measureValue, metric, secondaryMeasure } = props;
  const isDiff = isDiffMetric(metric.key);
  const hasHistory =
    [
      ComponentQualifier.Portfolio,
      ComponentQualifier.SubPortfolio,
      ComponentQualifier.Application,
      ComponentQualifier.Project,
    ].includes(component.qualifier as ComponentQualifier) && hasFullMeasures(branchLike);
  const displayLeak = hasFullMeasures(branchLike);
  return (
    <div className="sw-mb-4">
      <div className="sw-flex sw-items-center sw-justify-between sw-gap-4">
        <div className="it__measure-details-metric sw-flex sw-items-center sw-gap-1">
          <strong className="sw-body-md-highlight">{getLocalizedMetricName(metric)}</strong>
          <Measure
            className={classNames('it__measure-details-value sw-body-md')}
            metricKey={metric.key}
            metricType={metric.type}
            value={measureValue}
            ratingComponent={
              <MetricsRatingBadge
                label={
                  measureValue
                    ? translateWithParameters(
                        'metric.has_rating_X',
                        formatMeasure(measureValue, MetricType.Rating),
                      )
                    : translate('metric.no_rating')
                }
                rating={formatMeasure(measureValue, MetricType.Rating) as MetricsLabel}
              />
            }
          />

          {!isDiff && hasHistory && (
            <Tooltip overlay={translate('component_measures.show_metric_history')}>
              <Highlight>
                <Link
                  className="it__show-history-link  sw-font-semibold sw-ml-4"
                  to={getMeasureHistoryUrl(component.key, metric.key, branchLike)}
                >
                  {translate('component_measures.see_metric_history')}
                </Link>
              </Highlight>
            </Tooltip>
          )}
        </div>
        {displayLeak && leakPeriod && (
          <LeakPeriodLegend component={component} period={leakPeriod} />
        )}
      </div>
      {secondaryMeasure &&
        secondaryMeasure.metric === MetricKey.ncloc_language_distribution &&
        secondaryMeasure.value !== undefined && (
          <div className="sw-inline-block sw-mt-2">
            <LanguageDistribution distribution={secondaryMeasure.value} />
          </div>
        )}
    </div>
  );
}
