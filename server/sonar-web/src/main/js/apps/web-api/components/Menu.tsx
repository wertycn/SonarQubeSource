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
import * as React from 'react';
import Link from '../../../components/common/Link';
import { queryToSearch } from '../../../helpers/urls';
import { WebApi } from '../../../types/types';
import { actionsFilter, isDomainPathActive, Query, serializeQuery } from '../utils';
import DeprecatedBadge from './DeprecatedBadge';
import InternalBadge from './InternalBadge';

interface Props {
  domains: WebApi.Domain[];
  query: Query;
  splat: string;
}

export default function Menu(props: Props) {
  const { domains, query, splat } = props;
  const filteredDomains = (domains || [])
    .map((domain) => {
      const filteredActions = domain.actions.filter((action) =>
        actionsFilter(query, domain, action),
      );
      return { ...domain, filteredActions };
    })
    .filter((domain) => domain.filteredActions.length);

  const renderDomain = (domain: WebApi.Domain) => {
    const internal = !domain.actions.find((action) => !action.internal);
    return (
      <li
        className={classNames('list-group-item sw-p-0', {
          active: isDomainPathActive(domain.path, splat),
        })}
        key={domain.path}
      >
        <Link
          to={{ pathname: '/web_api/' + domain.path, search: queryToSearch(serializeQuery(query)) }}
        >
          <h3 className="sw-truncate sw-px-2 sw-py-3">
            {domain.path}
            {domain.deprecatedSince && <DeprecatedBadge since={domain.deprecatedSince} />}
            {internal && <InternalBadge />}
          </h3>
        </Link>
      </li>
    );
  };

  return (
    <div className="api-documentation-results panel" role="menu">
      <ul className="list-group">{filteredDomains.map(renderDomain)}</ul>
    </div>
  );
}
