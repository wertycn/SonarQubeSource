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
import { throwGlobalError } from '../helpers/error';
import { getJSON, post, postJSON, requestTryAndRepeatUntil } from '../helpers/request';
import { SystemUpgrade } from '../types/system';
import { SysInfoCluster, SysInfoStandalone, SysStatus } from '../types/types';

export function setLogLevel(level: string): Promise<void | Response> {
  return post('/api/system/change_log_level', { level }).catch(throwGlobalError);
}

export function getSystemInfo(): Promise<SysInfoCluster | SysInfoStandalone> {
  return getJSON('/api/system/info').catch(throwGlobalError);
}

export function getSystemStatus(): Promise<{ id: string; version: string; status: SysStatus }> {
  return getJSON('/api/system/status');
}

export function getSystemUpgrades(): Promise<{
  upgrades: SystemUpgrade[];
  latestLTS: string;
  updateCenterRefresh: string;
}> {
  return getJSON('/api/system/upgrades');
}

export function getMigrationStatus(): Promise<{
  message?: string;
  startedAt?: string;
  state: string;
}> {
  return getJSON('/api/system/db_migration_status');
}

export function migrateDatabase(): Promise<{
  message?: string;
  startedAt?: string;
  state: string;
}> {
  return postJSON('/api/system/migrate_db');
}

export function restart(): Promise<void | Response> {
  return post('/api/system/restart').catch(throwGlobalError);
}

export function waitSystemUPStatus(): Promise<{
  id: string;
  version: string;
  status: SysStatus;
}> {
  return requestTryAndRepeatUntil(
    getSystemStatus,
    { max: -1, slowThreshold: -15 },
    ({ status }) => status === 'UP',
  );
}
