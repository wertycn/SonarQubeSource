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
package org.sonar.server.almsettings.ws;

import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.alm.client.github.GithubGlobalSettingsValidator;
import org.sonar.alm.client.github.GithubPermissionConverter;
import org.sonar.api.server.ServerSide;
import org.sonar.auth.github.AppInstallationToken;
import org.sonar.auth.github.GitHubSettings;
import org.sonar.auth.github.GithubAppConfiguration;
import org.sonar.auth.github.client.GithubApplicationClient;
import org.sonar.auth.github.security.AccessToken;
import org.sonar.db.DbClient;
import org.sonar.db.DbSession;
import org.sonar.db.alm.setting.ALM;
import org.sonar.db.alm.setting.AlmSettingDto;
import org.sonar.server.almintegration.ws.ProjectKeyGenerator;
import org.sonar.server.exceptions.BadConfigurationException;
import org.sonar.server.management.ManagedProjectService;
import org.sonar.server.permission.PermissionService;
import org.sonar.server.permission.PermissionUpdater;
import org.sonar.server.permission.UserPermissionChange;
import org.sonar.server.project.ws.ProjectCreator;
import org.sonar.server.user.UserSession;

import static java.lang.String.format;
import static org.sonar.core.ce.CeTaskCharacteristics.DEVOPS_PLATFORM_PROJECT_IDENTIFIER;
import static org.sonar.core.ce.CeTaskCharacteristics.DEVOPS_PLATFORM_URL;

@ServerSide
public class GithubProjectCreatorFactory implements DevOpsProjectCreatorFactory {
  private static final Logger LOG = LoggerFactory.getLogger(GithubProjectCreatorFactory.class);

  private final DbClient dbClient;
  private final GithubGlobalSettingsValidator githubGlobalSettingsValidator;
  private final GithubApplicationClient githubApplicationClient;
  private final ProjectKeyGenerator projectKeyGenerator;
  private final ProjectCreator projectCreator;
  private final UserSession userSession;
  private final GitHubSettings gitHubSettings;
  private final GithubPermissionConverter githubPermissionConverter;
  private final PermissionUpdater<UserPermissionChange> permissionUpdater;
  private final PermissionService permissionService;
  private final ManagedProjectService managedProjectService;

  public GithubProjectCreatorFactory(DbClient dbClient, GithubGlobalSettingsValidator githubGlobalSettingsValidator,
    GithubApplicationClient githubApplicationClient, ProjectKeyGenerator projectKeyGenerator, UserSession userSession,
    ProjectCreator projectCreator, GitHubSettings gitHubSettings, GithubPermissionConverter githubPermissionConverter,
    PermissionUpdater<UserPermissionChange> permissionUpdater, PermissionService permissionService, ManagedProjectService managedProjectService) {
    this.dbClient = dbClient;
    this.githubGlobalSettingsValidator = githubGlobalSettingsValidator;
    this.githubApplicationClient = githubApplicationClient;
    this.projectKeyGenerator = projectKeyGenerator;
    this.userSession = userSession;
    this.projectCreator = projectCreator;
    this.gitHubSettings = gitHubSettings;
    this.githubPermissionConverter = githubPermissionConverter;
    this.permissionUpdater = permissionUpdater;
    this.permissionService = permissionService;
    this.managedProjectService = managedProjectService;
  }

  @Override
  public Optional<DevOpsProjectCreator> getDevOpsProjectCreator(DbSession dbSession, Map<String, String> characteristics) {
    String githubApiUrl = characteristics.get(DEVOPS_PLATFORM_URL);
    String githubRepository = characteristics.get(DEVOPS_PLATFORM_PROJECT_IDENTIFIER);
    if (githubApiUrl == null || githubRepository == null) {
      return Optional.empty();
    }
    DevOpsProjectDescriptor devOpsProjectDescriptor = new DevOpsProjectDescriptor(ALM.GITHUB, githubApiUrl, githubRepository);

    return dbClient.almSettingDao().selectByAlm(dbSession, ALM.GITHUB).stream()
      .filter(almSettingDto -> devOpsProjectDescriptor.url().equals(almSettingDto.getUrl()))
      .map(almSettingDto -> findInstallationIdAndCreateDevOpsProjectCreator(devOpsProjectDescriptor, almSettingDto))
      .flatMap(Optional::stream)
      .findFirst();

  }

  private Optional<DevOpsProjectCreator> findInstallationIdAndCreateDevOpsProjectCreator(DevOpsProjectDescriptor devOpsProjectDescriptor,
    AlmSettingDto almSettingDto) {
    GithubAppConfiguration githubAppConfiguration = githubGlobalSettingsValidator.validate(almSettingDto);
    return findInstallationIdToAccessRepo(githubAppConfiguration, devOpsProjectDescriptor.projectIdentifier())
      .map(installationId -> generateAppInstallationToken(githubAppConfiguration, installationId))
      .map(appInstallationToken -> createGithubProjectCreator(devOpsProjectDescriptor, almSettingDto, appInstallationToken));
  }

  private GithubProjectCreator createGithubProjectCreator(DevOpsProjectDescriptor devOpsProjectDescriptor, AlmSettingDto almSettingDto,
    AppInstallationToken appInstallationToken) {
    LOG.info("DevOps configuration {} auto-detected for project {}", almSettingDto.getKey(), devOpsProjectDescriptor.projectIdentifier());
    Optional<AppInstallationToken> authAppInstallationToken = getAuthAppInstallationTokenIfNecessary(devOpsProjectDescriptor);

    GithubProjectCreationParameters githubProjectCreationParameters = new GithubProjectCreationParameters(devOpsProjectDescriptor, almSettingDto, userSession, appInstallationToken,
      authAppInstallationToken.orElse(null));
    return new GithubProjectCreator(dbClient, githubApplicationClient, githubPermissionConverter, projectKeyGenerator, permissionUpdater, permissionService,
      managedProjectService, projectCreator, githubProjectCreationParameters, gitHubSettings);
  }

  public DevOpsProjectCreator getDevOpsProjectCreator(AlmSettingDto almSettingDto, AccessToken accessToken,
    DevOpsProjectDescriptor devOpsProjectDescriptor) {

    Optional<AppInstallationToken> authAppInstallationToken = getAuthAppInstallationTokenIfNecessary(devOpsProjectDescriptor);
    GithubProjectCreationParameters githubProjectCreationParameters = new GithubProjectCreationParameters(devOpsProjectDescriptor, almSettingDto, userSession, accessToken,
      authAppInstallationToken.orElse(null));
    return new GithubProjectCreator(dbClient, githubApplicationClient, githubPermissionConverter, projectKeyGenerator, permissionUpdater, permissionService,
      managedProjectService, projectCreator, githubProjectCreationParameters, gitHubSettings
    );
  }

  private Optional<AppInstallationToken> getAuthAppInstallationTokenIfNecessary(DevOpsProjectDescriptor devOpsProjectDescriptor) {
    if (gitHubSettings.isProvisioningEnabled()) {
      GithubAppConfiguration githubAppConfiguration = new GithubAppConfiguration(Long.parseLong(gitHubSettings.appId()), gitHubSettings.privateKey(), gitHubSettings.apiURL());
      long installationId = findInstallationIdToAccessRepo(githubAppConfiguration, devOpsProjectDescriptor.projectIdentifier())
        .orElseThrow(() -> new BadConfigurationException("PROJECT",
          format("GitHub auto-provisioning is activated. However the repo %s is not in the scope of the authentication application. "
          + "The permissions can't be checked, and the project can not be created.",
          devOpsProjectDescriptor.projectIdentifier())));
      return Optional.of(generateAppInstallationToken(githubAppConfiguration, installationId));
    }
    return Optional.empty();
  }

  private Optional<Long> findInstallationIdToAccessRepo(GithubAppConfiguration githubAppConfiguration, String repositoryKey) {
    return githubApplicationClient.getInstallationId(githubAppConfiguration, repositoryKey);
  }

  private AppInstallationToken generateAppInstallationToken(GithubAppConfiguration githubAppConfiguration, long installationId) {
    return githubApplicationClient.createAppInstallationToken(githubAppConfiguration, installationId)
      .orElseThrow(() -> new IllegalStateException(format("Error while generating token for GitHub Api Url %s (installation id: %s)",
        githubAppConfiguration.getApiEndpoint(), installationId)));
  }

}
