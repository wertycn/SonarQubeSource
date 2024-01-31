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
import { DrilldownLink, SizeIndicator } from 'design-system';
import * as React from 'react';
import { translate, translateWithParameters } from '../../../../helpers/l10n';
import { formatMeasure, localizeMetric } from '../../../../helpers/measures';
import { getComponentDrilldownUrl } from '../../../../helpers/urls';
import { ComponentQualifier } from '../../../../types/component';
import { MetricKey } from '../../../../types/metrics';
import { Component, Measure } from '../../../../types/types';

interface MetaSizeProps {
  component: Component;
  measures: Measure[];
}

export default function MetaSize({ component, measures }: MetaSizeProps) {
  const isApp = component.qualifier === ComponentQualifier.Application;
  const ncloc = measures.find((measure) => measure.metric === MetricKey.ncloc);
  const projects = isApp
    ? measures.find((measure) => measure.metric === MetricKey.projects)
    : undefined;
  const url = getComponentDrilldownUrl({
    componentKey: component.key,
    metric: MetricKey.ncloc,
    listView: true,
  });

  return (
    <>
      <div className="sw-flex sw-items-center">
        <h3>{localizeMetric(MetricKey.ncloc)}</h3>
        <span className="sw-ml-1 small">({translate('project.info.main_branch')})</span>
      </div>
      <div className="sw-flex sw-items-center">
        {ncloc && ncloc.value ? (
          <>
            <DrilldownLink className="huge" to={url}>
              <span
                aria-label={translateWithParameters(
                  'project.info.see_more_info_on_x_locs',
                  ncloc.value,
                )}
              >
                {formatMeasure(ncloc.value, 'SHORT_INT')}
              </span>
            </DrilldownLink>

            <span className="spacer-left">
              <SizeIndicator value={Number(ncloc.value)} size="xs" />
            </span>
          </>
        ) : (
          <span>0</span>
        )}

        {isApp && (
          <span className="huge-spacer-left display-inline-flex-center">
            {projects ? (
              <DrilldownLink to={url}>
                <span className="big">{formatMeasure(projects.value, 'SHORT_INT')}</span>
              </DrilldownLink>
            ) : (
              <span className="big">0</span>
            )}
            <span className="little-spacer-left text-muted">
              {translate('metric.projects.name')}
            </span>
          </span>
        )}
      </div>
    </>
  );
}
