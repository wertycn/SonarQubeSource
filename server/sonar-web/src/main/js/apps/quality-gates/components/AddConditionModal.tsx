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
import { ButtonPrimary, FormField, Modal, RadioButton } from 'design-system';
import * as React from 'react';
import { getLocalizedMetricName, translate } from '../../../helpers/l10n';
import { isDiffMetric } from '../../../helpers/measures';
import { useCreateConditionMutation } from '../../../queries/quality-gates';
import { Condition, Metric, QualityGate } from '../../../types/types';
import { getPossibleOperators } from '../utils';
import ConditionOperator from './ConditionOperator';
import MetricSelect from './MetricSelect';
import ThresholdInput from './ThresholdInput';

interface Props {
  metrics: Metric[];
  onClose: () => void;
  qualityGate: QualityGate;
}

const ADD_CONDITION_MODAL_ID = 'add-condition-modal';

export default function AddConditionModal({ metrics, onClose, qualityGate }: Readonly<Props>) {
  const [errorThreshold, setErrorThreshold] = React.useState('');
  const [scope, setScope] = React.useState<'new' | 'overall'>('new');
  const [selectedMetric, setSelectedMetric] = React.useState<Metric | undefined>();
  const [selectedOperator, setSelectedOperator] = React.useState<string | undefined>();
  const { mutateAsync: createCondition } = useCreateConditionMutation(qualityGate.name);

  const getSinglePossibleOperator = (metric: Metric) => {
    const operators = getPossibleOperators(metric);
    return Array.isArray(operators) ? undefined : operators;
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (selectedMetric) {
      const newCondition: Omit<Condition, 'id'> = {
        metric: selectedMetric.key,
        op: getSinglePossibleOperator(selectedMetric) ?? selectedOperator,
        error: errorThreshold,
      };
      await createCondition(newCondition);
      onClose();
    }
  };

  const handleScopeChange = (scope: 'new' | 'overall') => {
    let correspondingMetric;

    if (selectedMetric) {
      const correspondingMetricKey =
        scope === 'new' ? `new_${selectedMetric.key}` : selectedMetric.key.replace(/^new_/, '');
      correspondingMetric = metrics.find((m) => m.key === correspondingMetricKey);
    }

    setScope(scope);
    setSelectedMetric(correspondingMetric);
  };

  const handleMetricChange = (metric: Metric) => {
    setSelectedMetric(metric);
    setSelectedOperator(undefined);
    setErrorThreshold('');
  };

  const handleOperatorChange = (op: string) => {
    setSelectedOperator(op);
  };

  const handleErrorChange = (error: string) => {
    setErrorThreshold(error);
  };

  const renderBody = () => {
    return (
      <form onSubmit={handleFormSubmit} id={ADD_CONDITION_MODAL_ID}>
        <FormField label={translate('quality_gates.conditions.where')}>
          <div className="sw-flex sw-gap-4">
            <RadioButton checked={scope === 'new'} onCheck={handleScopeChange} value="new">
              <span data-test="quality-gates__condition-scope-new">
                {translate('quality_gates.conditions.new_code')}
              </span>
            </RadioButton>
            <RadioButton checked={scope === 'overall'} onCheck={handleScopeChange} value="overall">
              <span data-test="quality-gates__condition-scope-overall">
                {translate('quality_gates.conditions.overall_code')}
              </span>
            </RadioButton>
          </div>
        </FormField>

        <FormField
          description={selectedMetric && getLocalizedMetricName(selectedMetric)}
          htmlFor="condition-metric"
          label={translate('quality_gates.conditions.fails_when')}
        >
          <MetricSelect
            metric={selectedMetric}
            metricsArray={metrics.filter((m) =>
              scope === 'new' ? isDiffMetric(m.key) : !isDiffMetric(m.key),
            )}
            onMetricChange={handleMetricChange}
          />
        </FormField>

        {selectedMetric && (
          <div className="sw-flex sw-gap-2">
            <FormField
              className="sw-mb-0"
              htmlFor="condition-operator"
              label={translate('quality_gates.conditions.operator')}
            >
              <ConditionOperator
                metric={selectedMetric}
                onOperatorChange={handleOperatorChange}
                op={selectedOperator}
              />
            </FormField>
            <FormField
              htmlFor="condition-threshold"
              label={translate('quality_gates.conditions.value')}
            >
              <ThresholdInput
                metric={selectedMetric}
                name="error"
                onChange={handleErrorChange}
                value={errorThreshold}
              />
            </FormField>
          </div>
        )}
      </form>
    );
  };

  return (
    <Modal
      isScrollable={false}
      isOverflowVisible
      headerTitle={translate('quality_gates.add_condition')}
      onClose={onClose}
      body={renderBody()}
      primaryButton={
        <ButtonPrimary
          autoFocus
          disabled={selectedMetric === undefined}
          id="add-condition-button"
          form={ADD_CONDITION_MODAL_ID}
          type="submit"
        >
          {translate('quality_gates.add_condition')}
        </ButtonPrimary>
      }
      secondaryButtonLabel={translate('close')}
    />
  );
}
