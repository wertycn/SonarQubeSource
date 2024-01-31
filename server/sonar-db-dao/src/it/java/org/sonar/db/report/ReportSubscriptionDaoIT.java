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
package org.sonar.db.report;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.jetbrains.annotations.NotNull;
import org.junit.Rule;
import org.junit.Test;
import org.sonar.api.utils.System2;
import org.sonar.db.DbTester;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

public class ReportSubscriptionDaoIT {

  @Rule
  public DbTester db = DbTester.create(System2.INSTANCE);

  private final ReportSubscriptionDao underTest = db.getDbClient().reportSubscriptionDao();


  @Test
  public void insert_shouldInsertSubscriptionCorrectly() {
    underTest.insert(db.getSession(), createSubscriptionDto("uuid").setPortfolioUuid("pf").setUserUuid("userUuid"));
    Set<ReportSubscriptionDto> reportSubscriptionDtos = underTest.selectAll(db.getSession());
    assertThat(reportSubscriptionDtos).hasSize(1);
    assertThat(reportSubscriptionDtos.iterator().next()).extracting(r -> r.getUuid(), r -> r.getUserUuid(), r -> r.getBranchUuid(), r -> r.getPortfolioUuid())
      .containsExactly("uuid", "userUuid", null, "pf");
  }

  @Test
  public void insert_shouldPersistOnlyOneSubscription() {
    ReportSubscriptionDto subscriptionDto = createSubscriptionDto("uuid").setPortfolioUuid("pf").setUserUuid("userUuid");
    underTest.insert(db.getSession(), subscriptionDto);
    db.getSession().commit();

    assertThatThrownBy(()->  underTest.insert(db.getSession(), subscriptionDto)).isNotNull();
  }

  @Test
  public void insert_shouldPersistDifferentSubscriptions() {
    underTest.insert(db.getSession(), createSubscriptionDto("uuid").setBranchUuid("branch").setUserUuid("userUuid"));
    underTest.insert(db.getSession(), createSubscriptionDto("uuid2").setBranchUuid("branch").setUserUuid("userUuid2"));
    underTest.insert(db.getSession(), createSubscriptionDto("uuid3").setBranchUuid("branch2").setUserUuid("userUuid"));
    underTest.insert(db.getSession(), createSubscriptionDto("uuid4").setPortfolioUuid("pf").setUserUuid("userUuid"));

    Set<ReportSubscriptionDto> reportSubscriptionDtos = underTest.selectAll(db.getSession());
    assertThat(reportSubscriptionDtos).hasSize(4);
  }

  @Test
  public void delete_shouldRemoveExistingSubscription() {
    ReportSubscriptionDto subscriptionPf = createSubscriptionDto("uuid").setPortfolioUuid("pf").setUserUuid("userUuid");
    ReportSubscriptionDto subscriptionBranch = createSubscriptionDto("uuid2").setBranchUuid("branch").setUserUuid("userUuid2");

    underTest.insert(db.getSession(), subscriptionPf);
    underTest.insert(db.getSession(), subscriptionBranch);

    underTest.delete(db.getSession(), subscriptionPf);

    assertThat(underTest.selectAll(db.getSession())).hasSize(1)
        .extracting(p->p.getUuid()).containsExactly("uuid2");

    underTest.delete(db.getSession(), subscriptionBranch);

    assertThat(underTest.selectAll(db.getSession())).isEmpty();
  }

  @Test
  public void selectByPortfolio_shouldReturnRelatedListOfSubscriptions() {
    ReportSubscriptionDto subscriptionPf = createSubscriptionDto("uuid").setPortfolioUuid("pf").setUserUuid("userUuid");
    ReportSubscriptionDto subscriptionPf2 = createSubscriptionDto("uuid2").setPortfolioUuid("pf").setUserUuid("userUuid2");
    ReportSubscriptionDto subscriptionBranch = createSubscriptionDto("uuid3").setBranchUuid("branch").setUserUuid("userUuid2");

    underTest.insert(db.getSession(), subscriptionPf);
    underTest.insert(db.getSession(), subscriptionPf2);
    underTest.insert(db.getSession(), subscriptionBranch);

    List<ReportSubscriptionDto> reportSubscriptionDtos = underTest.selectByPortfolio(db.getSession(), subscriptionPf.getPortfolioUuid());

    assertThat(reportSubscriptionDtos).hasSize(2).extracting(r -> r.getUuid(), r -> r.getUserUuid(), r -> r.getPortfolioUuid())
      .containsExactly(tuple("uuid", "userUuid", "pf"), tuple("uuid2", "userUuid2", "pf"));
  }

  @Test
  public void selectByProjectBranch_shouldReturnRelatedListOfSubscriptions() {
    ReportSubscriptionDto subscriptionBranch = createSubscriptionDto("uuid").setBranchUuid("branch").setUserUuid("userUuid");
    ReportSubscriptionDto subscriptionBranch2 = createSubscriptionDto("uuid2").setBranchUuid("branch").setUserUuid("userUuid2");
    ReportSubscriptionDto subscriptionPf = createSubscriptionDto("uuid3").setPortfolioUuid("pf1").setUserUuid("userUuid2");

    underTest.insert(db.getSession(), subscriptionBranch);
    underTest.insert(db.getSession(), subscriptionBranch2);
    underTest.insert(db.getSession(), subscriptionPf);

    List<ReportSubscriptionDto> reportSubscriptionDtos = underTest.selectByProjectBranch(db.getSession(), "branch");

    assertThat(reportSubscriptionDtos).hasSize(2).extracting(r -> r.getUuid(), r -> r.getUserUuid(), r -> r.getBranchUuid())
      .containsExactly(tuple("uuid", "userUuid", "branch"), tuple("uuid2", "userUuid2", "branch"));
  }

  @Test
  public void selectByUserAndPortfolio_shouldReturnRelatedSubscription() {
    ReportSubscriptionDto subscriptionPf = createSubscriptionDto("uuid").setPortfolioUuid("pf").setUserUuid("userUuid");
    ReportSubscriptionDto subscriptionPf2 = createSubscriptionDto("uuid2").setPortfolioUuid("pf").setUserUuid("userUuid2");
    ReportSubscriptionDto subscriptionBranch = createSubscriptionDto("uuid3").setBranchUuid("branch").setUserUuid("userUuid2");

    underTest.insert(db.getSession(), subscriptionPf);
    underTest.insert(db.getSession(), subscriptionPf2);
    underTest.insert(db.getSession(), subscriptionBranch);

    Optional<ReportSubscriptionDto> reportSubscriptionDtos = underTest.selectByUserAndPortfolio(db.getSession(), subscriptionPf.getPortfolioUuid(), subscriptionPf.getUserUuid());

    assertThat(reportSubscriptionDtos).isPresent().get().extracting(r->r.getUuid()).isEqualTo("uuid");
  }

  @Test
  public void selectByUserAndBranch_shouldReturnRelatedSubscription() {
    ReportSubscriptionDto subscriptionPf = createSubscriptionDto("uuid").setPortfolioUuid("pf").setUserUuid("userUuid");
    ReportSubscriptionDto subscriptionPf2 = createSubscriptionDto("uuid2").setPortfolioUuid("pf").setUserUuid("userUuid2");
    ReportSubscriptionDto subscriptionBranch = createSubscriptionDto("uuid3").setBranchUuid("branch").setUserUuid("userUuid2");

    underTest.insert(db.getSession(), subscriptionPf);
    underTest.insert(db.getSession(), subscriptionPf2);
    underTest.insert(db.getSession(), subscriptionBranch);

    Optional<ReportSubscriptionDto> reportSubscriptionDtos = underTest.selectByUserAndBranch(db.getSession(), subscriptionBranch.getBranchUuid(), subscriptionBranch.getUserUuid());

    assertThat(reportSubscriptionDtos).isPresent().get().extracting(r->r.getUuid()).isEqualTo("uuid3");
  }

  @NotNull
  private static ReportSubscriptionDto createSubscriptionDto(String uuid) {
    return new ReportSubscriptionDto().setUuid(uuid);
  }


}
