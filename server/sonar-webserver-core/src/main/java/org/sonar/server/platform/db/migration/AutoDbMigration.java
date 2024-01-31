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
package org.sonar.server.platform.db.migration;

import org.sonar.api.Startable;
import org.slf4j.LoggerFactory;
import org.sonar.server.platform.DefaultServerUpgradeStatus;
import org.sonar.server.platform.db.migration.engine.MigrationEngine;

public class AutoDbMigration implements Startable {
  private final DefaultServerUpgradeStatus serverUpgradeStatus;
  private final MigrationEngine migrationEngine;

  public AutoDbMigration(DefaultServerUpgradeStatus serverUpgradeStatus, MigrationEngine migrationEngine) {
    this.serverUpgradeStatus = serverUpgradeStatus;
    this.migrationEngine = migrationEngine;
  }

  @Override
  public void start() {
    if (serverUpgradeStatus.isFreshInstall()) {
      LoggerFactory.getLogger(getClass()).info("Automatically perform DB migration on fresh install");
      migrationEngine.execute();
    } else if (serverUpgradeStatus.isUpgraded() && serverUpgradeStatus.isAutoDbUpgrade()) {
      LoggerFactory.getLogger(getClass()).info("Automatically perform DB migration, as automatic database upgrade is enabled");
      migrationEngine.execute();
    }
  }

  @Override
  public void stop() {
    // nothing to do
  }

}
