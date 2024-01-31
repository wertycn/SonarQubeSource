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
import { cloneDeep } from 'lodash';
import { mockTask } from '../../helpers/mocks/tasks';
import {
  GitHubConfigurationStatus,
  GitHubMapping,
  GitHubProvisioningStatus,
} from '../../types/provisioning';
import { Task, TaskStatuses, TaskTypes } from '../../types/tasks';
import {
  activateGithubProvisioning,
  addGithubRolesMapping,
  checkConfigurationValidity,
  deactivateGithubProvisioning,
  deleteGithubRolesMapping,
  fetchGithubProvisioningStatus,
  fetchGithubRolesMapping,
  updateGithubRolesMapping,
} from '../github-provisioning';

jest.mock('../github-provisioning');

const defaultConfigurationStatus: GitHubConfigurationStatus = {
  application: {
    jit: {
      status: GitHubProvisioningStatus.Success,
    },
    autoProvisioning: {
      status: GitHubProvisioningStatus.Success,
    },
  },
  installations: [
    {
      organization: 'testOrg',
      autoProvisioning: {
        status: GitHubProvisioningStatus.Success,
      },
      jit: {
        status: GitHubProvisioningStatus.Success,
      },
    },
  ],
};

const githubMappingMock = (
  id: string,
  permissions: (keyof GitHubMapping['permissions'])[],
  baseRole = false,
) => ({
  id,
  githubRole: id,
  baseRole,
  permissions: {
    user: permissions.includes('user'),
    codeViewer: permissions.includes('codeViewer'),
    issueAdmin: permissions.includes('issueAdmin'),
    securityHotspotAdmin: permissions.includes('securityHotspotAdmin'),
    admin: permissions.includes('admin'),
    scan: permissions.includes('scan'),
  },
});

const defaultMapping: GitHubMapping[] = [
  githubMappingMock('read', ['user', 'codeViewer'], true),
  githubMappingMock(
    'write',
    ['user', 'codeViewer', 'issueAdmin', 'securityHotspotAdmin', 'scan'],
    true,
  ),
  githubMappingMock('triage', ['user', 'codeViewer'], true),
  githubMappingMock(
    'maintain',
    ['user', 'codeViewer', 'issueAdmin', 'securityHotspotAdmin', 'scan'],
    true,
  ),
  githubMappingMock(
    'admin',
    ['user', 'codeViewer', 'issueAdmin', 'securityHotspotAdmin', 'admin', 'scan'],
    true,
  ),
];

export default class GithubProvisioningServiceMock {
  githubProvisioningStatus: boolean;
  githubConfigurationStatus: GitHubConfigurationStatus;
  githubMapping: GitHubMapping[];
  tasks: Task[];

  constructor() {
    this.githubProvisioningStatus = false;
    this.githubConfigurationStatus = cloneDeep(defaultConfigurationStatus);
    this.githubMapping = cloneDeep(defaultMapping);
    this.tasks = [];
    jest
      .mocked(activateGithubProvisioning)
      .mockImplementation(this.handleActivateGithubProvisioning);
    jest
      .mocked(deactivateGithubProvisioning)
      .mockImplementation(this.handleDeactivateGithubProvisioning);
    jest
      .mocked(fetchGithubProvisioningStatus)
      .mockImplementation(this.handleFetchGithubProvisioningStatus);
    jest
      .mocked(checkConfigurationValidity)
      .mockImplementation(this.handleCheckConfigurationValidity);
    jest.mocked(fetchGithubRolesMapping).mockImplementation(this.handleFetchGithubRolesMapping);
    jest.mocked(updateGithubRolesMapping).mockImplementation(this.handleUpdateGithubRolesMapping);
    jest.mocked(addGithubRolesMapping).mockImplementation(this.handleAddGithubRolesMapping);
    jest.mocked(deleteGithubRolesMapping).mockImplementation(this.handleDeleteGithubRolesMapping);
  }

  addProvisioningTask = (overrides: Partial<Omit<Task, 'type'>> = {}) => {
    this.tasks.push(
      mockTask({
        id: Math.random().toString(),
        type: TaskTypes.GithubProvisioning,
        ...overrides,
      }),
    );
  };

  setConfigurationValidity = (overrides: Partial<GitHubConfigurationStatus> = {}) => {
    this.githubConfigurationStatus = {
      ...this.githubConfigurationStatus,
      ...overrides,
    };
  };

  enableGithubProvisioning = () => {
    this.githubProvisioningStatus = true;
  };

  handleActivateGithubProvisioning = () => {
    this.githubProvisioningStatus = true;
    return Promise.resolve();
  };

  handleDeactivateGithubProvisioning = () => {
    this.githubProvisioningStatus = false;
    return Promise.resolve();
  };

  handleFetchGithubProvisioningStatus = () => {
    if (!this.githubProvisioningStatus) {
      return Promise.resolve({ enabled: false });
    }

    const nextSync = this.tasks.find((t: Task) =>
      [TaskStatuses.InProgress, TaskStatuses.Pending].includes(t.status),
    );
    const lastSync = this.tasks.find(
      (t: Task) => ![TaskStatuses.InProgress, TaskStatuses.Pending].includes(t.status),
    );

    return Promise.resolve({
      enabled: true,
      nextSync: nextSync ? { status: nextSync.status } : undefined,
      lastSync: lastSync
        ? {
            status: lastSync.status,
            finishedAt: lastSync.executedAt,
            startedAt: lastSync.startedAt,
            executionTimeMs: lastSync.executionTimeMs,
            summary: lastSync.status === TaskStatuses.Success ? 'Test summary' : undefined,
            errorMessage: lastSync.errorMessage,
            warningMessage: lastSync.warnings?.join() ?? undefined,
          }
        : undefined,
    });
  };

  handleCheckConfigurationValidity = () => {
    return Promise.resolve(this.githubConfigurationStatus);
  };

  handleFetchGithubRolesMapping: typeof fetchGithubRolesMapping = () => {
    return Promise.resolve(this.githubMapping);
  };

  handleUpdateGithubRolesMapping: typeof updateGithubRolesMapping = (id, data) => {
    this.githubMapping = this.githubMapping.map((mapping) =>
      mapping.id === id ? { ...mapping, ...data } : mapping,
    );

    return Promise.resolve(
      this.githubMapping.find((mapping) => mapping.id === id) as GitHubMapping,
    );
  };

  handleAddGithubRolesMapping: typeof addGithubRolesMapping = (data) => {
    const newRole = { ...data, id: data.githubRole };
    this.githubMapping = [...this.githubMapping, newRole];

    return Promise.resolve(newRole);
  };

  handleDeleteGithubRolesMapping: typeof deleteGithubRolesMapping = (id) => {
    this.githubMapping = this.githubMapping.filter((el) => el.id !== id);
    return Promise.resolve();
  };

  addGitHubCustomRole = (id: string, permissions: (keyof GitHubMapping['permissions'])[]) => {
    this.githubMapping = [...this.githubMapping, githubMappingMock(id, permissions)];
  };

  reset = () => {
    this.githubProvisioningStatus = false;
    this.githubConfigurationStatus = cloneDeep(defaultConfigurationStatus);
    this.githubMapping = cloneDeep(defaultMapping);
    this.tasks = [];
  };
}
