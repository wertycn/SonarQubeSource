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
package org.sonar.server.measure.live;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import javax.annotation.Nullable;
import org.junit.Test;
import org.sonar.api.issue.Issue;
import org.sonar.api.issue.impact.SoftwareQuality;
import org.sonar.api.measures.CoreMetrics;
import org.sonar.api.measures.Metric;
import org.sonar.api.rule.Severity;
import org.sonar.api.rules.RuleType;
import org.sonar.db.component.ComponentDto;
import org.sonar.db.issue.IssueGroupDto;
import org.sonar.db.issue.IssueImpactGroupDto;
import org.sonar.server.measure.DebtRatingGrid;
import org.sonar.server.measure.Rating;

import static java.util.Arrays.asList;
import static org.assertj.core.api.Assertions.assertThat;
import static org.sonar.api.issue.impact.Severity.HIGH;
import static org.sonar.api.issue.impact.Severity.LOW;
import static org.sonar.api.issue.impact.Severity.MEDIUM;
import static org.sonar.api.issue.impact.SoftwareQuality.MAINTAINABILITY;
import static org.sonar.api.issue.impact.SoftwareQuality.RELIABILITY;
import static org.sonar.api.issue.impact.SoftwareQuality.SECURITY;
import static org.sonar.api.measures.CoreMetrics.NEW_SECURITY_HOTSPOTS_REVIEWED;
import static org.sonar.api.measures.CoreMetrics.NEW_SECURITY_HOTSPOTS_REVIEWED_STATUS;
import static org.sonar.api.measures.CoreMetrics.NEW_SECURITY_HOTSPOTS_TO_REVIEW_STATUS;
import static org.sonar.api.measures.CoreMetrics.NEW_SECURITY_REVIEW_RATING;
import static org.sonar.api.measures.CoreMetrics.SECURITY_HOTSPOTS_REVIEWED;
import static org.sonar.api.measures.CoreMetrics.SECURITY_HOTSPOTS_REVIEWED_STATUS;
import static org.sonar.api.measures.CoreMetrics.SECURITY_HOTSPOTS_TO_REVIEW_STATUS;
import static org.sonar.api.measures.CoreMetrics.SECURITY_REVIEW_RATING;
import static org.sonar.test.JsonAssert.assertJson;

public class MeasureUpdateFormulaFactoryImplTest {

  public static final Gson GSON = new GsonBuilder().create();
  private final MeasureUpdateFormulaFactoryImpl underTest = new MeasureUpdateFormulaFactoryImpl();

  @Test
  public void getFormulaMetrics_include_the_dependent_metrics() {
    for (MeasureUpdateFormula formula : underTest.getFormulas()) {
      assertThat(underTest.getFormulaMetrics()).contains(formula.getMetric());
      for (Metric<?> dependentMetric : formula.getDependentMetrics()) {
        assertThat(underTest.getFormulaMetrics()).contains(dependentMetric);
      }
    }
  }

  @Test
  public void hierarchy_adding_numbers() {
    new HierarchyTester(CoreMetrics.VIOLATIONS)
      .withValue(1d)
      .withChildrenValues(2d, 3d)
      .expectedResult(6d);

    new HierarchyTester(CoreMetrics.BUGS)
      .withValue(0d)
      .withChildrenValues(2d, 3d)
      .expectedResult(5d);

    new HierarchyTester(CoreMetrics.NEW_BUGS)
      .withValue(1d)
      .expectedResult(1d);
  }

  @Test
  public void hierarchy_highest_rating() {
    new HierarchyTester(CoreMetrics.RELIABILITY_RATING)
      .withValue(1d)
      .withChildrenValues(2d, 3d)
      .expectedRating(Rating.C);

    // if no children, no need to set a value
    new HierarchyTester(CoreMetrics.SECURITY_RATING)
      .withValue(1d)
      .expectedResult(null);

    new HierarchyTester(CoreMetrics.NEW_RELIABILITY_RATING)
      .withValue(5d)
      .withChildrenValues(2d, 3d)
      .expectedRating(Rating.E);
  }

  @Test
  public void hierarchy_combining_other_metrics() {
    new HierarchyTester(SECURITY_HOTSPOTS_TO_REVIEW_STATUS)
      .withValue(SECURITY_HOTSPOTS_TO_REVIEW_STATUS, 1d)
      .withChildrenHotspotsCounts(10, 10, 2, 10)
      .expectedResult(3d);

    new HierarchyTester(SECURITY_HOTSPOTS_REVIEWED_STATUS)
      .withValue(SECURITY_HOTSPOTS_REVIEWED_STATUS, 1d)
      .withChildrenHotspotsCounts(2, 10, 10, 10)
      .expectedResult(3d);

    new HierarchyTester(NEW_SECURITY_HOTSPOTS_TO_REVIEW_STATUS)
      .withValue(NEW_SECURITY_HOTSPOTS_TO_REVIEW_STATUS, 1d)
      .withChildrenHotspotsCounts(10, 10, 10, 2)
      .expectedResult(3d);

    new HierarchyTester(NEW_SECURITY_HOTSPOTS_REVIEWED_STATUS)
      .withValue(NEW_SECURITY_HOTSPOTS_REVIEWED_STATUS, 1d)
      .withChildrenHotspotsCounts(10, 2, 10, 10)
      .expectedResult(3d);

    new HierarchyTester(CoreMetrics.SECURITY_HOTSPOTS_REVIEWED)
      .withValue(SECURITY_HOTSPOTS_TO_REVIEW_STATUS, 1d)
      .withValue(SECURITY_HOTSPOTS_REVIEWED_STATUS, 1d)
      .expectedResult(50d);
    new HierarchyTester(CoreMetrics.SECURITY_REVIEW_RATING)
      .withValue(SECURITY_HOTSPOTS_REVIEWED, 100d)
      .expectedRating(Rating.A);

    new HierarchyTester(CoreMetrics.NEW_SECURITY_HOTSPOTS_REVIEWED)
      .withValue(NEW_SECURITY_HOTSPOTS_TO_REVIEW_STATUS, 1d)
      .withValue(NEW_SECURITY_HOTSPOTS_REVIEWED_STATUS, 1d)
      .expectedResult(50d);
    new HierarchyTester(CoreMetrics.NEW_SECURITY_REVIEW_RATING)
      .withValue(NEW_SECURITY_HOTSPOTS_REVIEWED, 0d)
      .expectedRating(Rating.E);
  }

  @Test
  public void test_violations() {
    withNoIssues().assertThatValueIs(CoreMetrics.VIOLATIONS, 0);
    with(newGroup(), newGroup().setCount(4)).assertThatValueIs(CoreMetrics.VIOLATIONS, 5);

    // exclude resolved
    IssueGroupDto resolved = newResolvedGroup(Issue.RESOLUTION_FIXED, Issue.STATUS_RESOLVED);
    with(newGroup(), newGroup(), resolved).assertThatValueIs(CoreMetrics.VIOLATIONS, 2);

    // include issues on leak
    IssueGroupDto onLeak = newGroup().setCount(11).setInLeak(true);
    with(newGroup(), newGroup(), onLeak).assertThatValueIs(CoreMetrics.VIOLATIONS, 1 + 1 + 11);
  }

  @Test
  public void test_bugs() {
    withNoIssues().assertThatValueIs(CoreMetrics.BUGS, 0);
    with(
      newGroup(RuleType.BUG).setSeverity(Severity.MAJOR).setCount(3),
      newGroup(RuleType.BUG).setSeverity(Severity.CRITICAL).setCount(5),
      // exclude resolved
      newResolvedGroup(RuleType.BUG).setCount(7),
      // not bugs
      newGroup(RuleType.CODE_SMELL).setCount(11))
      .assertThatValueIs(CoreMetrics.BUGS, 3 + 5);
  }

  @Test
  public void test_code_smells() {
    withNoIssues().assertThatValueIs(CoreMetrics.CODE_SMELLS, 0);
    with(
      newGroup(RuleType.CODE_SMELL).setSeverity(Severity.MAJOR).setCount(3),
      newGroup(RuleType.CODE_SMELL).setSeverity(Severity.CRITICAL).setCount(5),
      // exclude resolved
      newResolvedGroup(RuleType.CODE_SMELL).setCount(7),
      // not code smells
      newGroup(RuleType.BUG).setCount(11))
      .assertThatValueIs(CoreMetrics.CODE_SMELLS, 3 + 5);
  }

  @Test
  public void test_vulnerabilities() {
    withNoIssues().assertThatValueIs(CoreMetrics.VULNERABILITIES, 0);
    with(
      newGroup(RuleType.VULNERABILITY).setSeverity(Severity.MAJOR).setCount(3),
      newGroup(RuleType.VULNERABILITY).setSeverity(Severity.CRITICAL).setCount(5),
      // exclude resolved
      newResolvedGroup(RuleType.VULNERABILITY).setCount(7),
      // not vulnerabilities
      newGroup(RuleType.BUG).setCount(11))
      .assertThatValueIs(CoreMetrics.VULNERABILITIES, 3 + 5);
  }

  @Test
  public void test_security_hotspots() {
    withNoIssues().assertThatValueIs(CoreMetrics.SECURITY_HOTSPOTS, 0);
    with(
      newGroup(RuleType.SECURITY_HOTSPOT).setSeverity(Severity.MAJOR).setCount(3),
      newGroup(RuleType.SECURITY_HOTSPOT).setSeverity(Severity.CRITICAL).setCount(5),
      // exclude resolved
      newResolvedGroup(RuleType.SECURITY_HOTSPOT).setCount(7),
      // not hotspots
      newGroup(RuleType.BUG).setCount(11))
      .assertThatValueIs(CoreMetrics.SECURITY_HOTSPOTS, 3 + 5);
  }

  @Test
  public void test_security_review_rating() {
    with(
      newGroup(RuleType.SECURITY_HOTSPOT).setStatus(Issue.STATUS_REVIEWED).setCount(3),
      newGroup(RuleType.SECURITY_HOTSPOT).setStatus(Issue.STATUS_TO_REVIEW).setCount(1))
      .assertThatValueIs(SECURITY_REVIEW_RATING, Rating.B);

    withNoIssues()
      .assertThatValueIs(SECURITY_REVIEW_RATING, Rating.A);
  }

  @Test
  public void test_security_hotspots_reviewed() {
    with(
      newGroup(RuleType.SECURITY_HOTSPOT).setStatus(Issue.STATUS_REVIEWED).setCount(3),
      newGroup(RuleType.SECURITY_HOTSPOT).setStatus(Issue.STATUS_TO_REVIEW).setCount(1))
      .assertThatValueIs(SECURITY_HOTSPOTS_REVIEWED, 75.0);

    withNoIssues()
      .assertNoValue(SECURITY_HOTSPOTS_REVIEWED);
  }

  @Test
  public void test_security_hotspots_reviewed_status() {
    with(
      newGroup(RuleType.SECURITY_HOTSPOT).setStatus(Issue.STATUS_REVIEWED).setCount(3),
      newGroup(RuleType.SECURITY_HOTSPOT).setStatus(Issue.STATUS_TO_REVIEW).setCount(1))
      .assertThatValueIs(CoreMetrics.SECURITY_HOTSPOTS_REVIEWED_STATUS, 3.0);

    withNoIssues()
      .assertThatValueIs(CoreMetrics.SECURITY_HOTSPOTS_REVIEWED_STATUS, 0.0);
  }

  @Test
  public void test_security_hotspots_to_review_status() {
    with(
      newGroup(RuleType.SECURITY_HOTSPOT).setStatus(Issue.STATUS_REVIEWED).setCount(3),
      newGroup(RuleType.SECURITY_HOTSPOT).setStatus(Issue.STATUS_TO_REVIEW).setCount(1))
      .assertThatValueIs(CoreMetrics.SECURITY_HOTSPOTS_TO_REVIEW_STATUS, 1.0);

    withNoIssues()
      .assertThatValueIs(CoreMetrics.SECURITY_HOTSPOTS_TO_REVIEW_STATUS, 0.0);
  }

  @Test
  public void count_unresolved_by_severity() {
    withNoIssues()
      .assertThatValueIs(CoreMetrics.BLOCKER_VIOLATIONS, 0)
      .assertThatValueIs(CoreMetrics.CRITICAL_VIOLATIONS, 0)
      .assertThatValueIs(CoreMetrics.MAJOR_VIOLATIONS, 0)
      .assertThatValueIs(CoreMetrics.MINOR_VIOLATIONS, 0)
      .assertThatValueIs(CoreMetrics.INFO_VIOLATIONS, 0);

    with(
      newGroup(RuleType.VULNERABILITY).setSeverity(Severity.MAJOR).setCount(3),
      newGroup(RuleType.BUG).setSeverity(Severity.MAJOR).setCount(5),
      newGroup(RuleType.BUG).setSeverity(Severity.CRITICAL).setCount(7),
      newGroup(RuleType.CODE_SMELL).setSeverity(Severity.BLOCKER).setCount(11),
      // exclude security hotspot
      newGroup(RuleType.SECURITY_HOTSPOT).setSeverity(Severity.CRITICAL).setCount(15),
      // include leak
      newGroup(RuleType.CODE_SMELL).setSeverity(Severity.BLOCKER).setInLeak(true).setCount(13),
      // exclude resolved
      newResolvedGroup(RuleType.VULNERABILITY).setSeverity(Severity.INFO).setCount(17),
      newResolvedGroup(RuleType.BUG).setSeverity(Severity.MAJOR).setCount(19),
      newResolvedGroup(RuleType.SECURITY_HOTSPOT).setSeverity(Severity.INFO).setCount(21))
      .assertThatValueIs(CoreMetrics.BLOCKER_VIOLATIONS, 11 + 13)
      .assertThatValueIs(CoreMetrics.CRITICAL_VIOLATIONS, 7)
      .assertThatValueIs(CoreMetrics.MAJOR_VIOLATIONS, 3 + 5)
      .assertThatValueIs(CoreMetrics.MINOR_VIOLATIONS, 0)
      .assertThatValueIs(CoreMetrics.INFO_VIOLATIONS, 0);
  }

  @Test
  public void count_resolved() {
    withNoIssues()
      .assertThatValueIs(CoreMetrics.FALSE_POSITIVE_ISSUES, 0)
      .assertThatValueIs(CoreMetrics.ACCEPTED_ISSUES, 0);

    with(
      newResolvedGroup(Issue.RESOLUTION_FIXED, Issue.STATUS_RESOLVED).setCount(3),
      newResolvedGroup(Issue.RESOLUTION_FALSE_POSITIVE, Issue.STATUS_CLOSED).setCount(5),
      newResolvedGroup(Issue.RESOLUTION_WONT_FIX, Issue.STATUS_CLOSED).setSeverity(Severity.MAJOR).setCount(7),
      newResolvedGroup(Issue.RESOLUTION_WONT_FIX, Issue.STATUS_CLOSED).setSeverity(Severity.BLOCKER).setCount(11),
      newResolvedGroup(Issue.RESOLUTION_REMOVED, Issue.STATUS_CLOSED).setCount(13),
      // exclude security hotspot
      newResolvedGroup(Issue.RESOLUTION_WONT_FIX, Issue.STATUS_RESOLVED).setCount(15).setRuleType(RuleType.SECURITY_HOTSPOT.getDbConstant()),
      // exclude unresolved
      newGroup(RuleType.VULNERABILITY).setCount(17),
      newGroup(RuleType.BUG).setCount(19))
      .assertThatValueIs(CoreMetrics.FALSE_POSITIVE_ISSUES, 5)
      .assertThatValueIs(CoreMetrics.ACCEPTED_ISSUES, 7 + 11);
  }

  @Test
  public void count_by_status() {
    withNoIssues()
      .assertThatValueIs(CoreMetrics.CONFIRMED_ISSUES, 0)
      .assertThatValueIs(CoreMetrics.OPEN_ISSUES, 0)
      .assertThatValueIs(CoreMetrics.REOPENED_ISSUES, 0);

    with(
      newGroup().setStatus(Issue.STATUS_CONFIRMED).setSeverity(Severity.BLOCKER).setCount(3),
      newGroup().setStatus(Issue.STATUS_CONFIRMED).setSeverity(Severity.INFO).setCount(5),
      newGroup().setStatus(Issue.STATUS_REOPENED).setCount(7),
      newGroup(RuleType.CODE_SMELL).setStatus(Issue.STATUS_OPEN).setCount(9),
      newGroup(RuleType.BUG).setStatus(Issue.STATUS_OPEN).setCount(11),
      // exclude security hotspot
      newGroup(RuleType.SECURITY_HOTSPOT).setStatus(Issue.STATUS_OPEN).setCount(12),
      newResolvedGroup(Issue.RESOLUTION_FALSE_POSITIVE, Issue.STATUS_CLOSED).setCount(13))
      .assertThatValueIs(CoreMetrics.CONFIRMED_ISSUES, 3 + 5)
      .assertThatValueIs(CoreMetrics.OPEN_ISSUES, 9 + 11)
      .assertThatValueIs(CoreMetrics.REOPENED_ISSUES, 7);
  }

  @Test
  public void test_technical_debt() {
    withNoIssues().assertThatValueIs(CoreMetrics.TECHNICAL_DEBT, 0);

    with(
      newGroup(RuleType.CODE_SMELL).setEffort(3.0).setInLeak(false),
      newGroup(RuleType.CODE_SMELL).setEffort(5.0).setInLeak(true),
      // exclude security hotspot
      newGroup(RuleType.SECURITY_HOTSPOT).setEffort(9).setInLeak(true),
      newGroup(RuleType.SECURITY_HOTSPOT).setEffort(11).setInLeak(false),
      // not code smells
      newGroup(RuleType.BUG).setEffort(7.0),
      // exclude resolved
      newResolvedGroup(RuleType.CODE_SMELL).setEffort(17.0))
      .assertThatValueIs(CoreMetrics.TECHNICAL_DEBT, 3.0 + 5.0);
  }

  @Test
  public void test_reliability_remediation_effort() {
    withNoIssues().assertThatValueIs(CoreMetrics.RELIABILITY_REMEDIATION_EFFORT, 0);

    with(
      newGroup(RuleType.BUG).setEffort(3.0),
      newGroup(RuleType.BUG).setEffort(5.0).setSeverity(Severity.BLOCKER),
      // not bugs
      newGroup(RuleType.CODE_SMELL).setEffort(7.0),
      // exclude resolved
      newResolvedGroup(RuleType.BUG).setEffort(17.0))
      .assertThatValueIs(CoreMetrics.RELIABILITY_REMEDIATION_EFFORT, 3.0 + 5.0);
  }

  @Test
  public void test_security_remediation_effort() {
    withNoIssues().assertThatValueIs(CoreMetrics.SECURITY_REMEDIATION_EFFORT, 0);

    with(
      newGroup(RuleType.VULNERABILITY).setEffort(3.0),
      newGroup(RuleType.VULNERABILITY).setEffort(5.0).setSeverity(Severity.BLOCKER),
      // not vulnerability
      newGroup(RuleType.CODE_SMELL).setEffort(7.0),
      // exclude resolved
      newResolvedGroup(RuleType.VULNERABILITY).setEffort(17.0))
      .assertThatValueIs(CoreMetrics.SECURITY_REMEDIATION_EFFORT, 3.0 + 5.0);
  }

  @Test
  public void test_sqale_debt_ratio_and_sqale_rating() {
    withNoIssues()
      .assertThatValueIs(CoreMetrics.SQALE_DEBT_RATIO, 0)
      .assertThatValueIs(CoreMetrics.SQALE_RATING, Rating.A);

    // technical_debt not computed
    with(CoreMetrics.DEVELOPMENT_COST, "0")
      .assertThatValueIs(CoreMetrics.SQALE_DEBT_RATIO, 0)
      .assertThatValueIs(CoreMetrics.SQALE_RATING, Rating.A);
    with(CoreMetrics.DEVELOPMENT_COST, "20")
      .assertThatValueIs(CoreMetrics.SQALE_DEBT_RATIO, 0)
      .assertThatValueIs(CoreMetrics.SQALE_RATING, Rating.A);

    // development_cost not computed
    with(CoreMetrics.TECHNICAL_DEBT, 0)
      .assertThatValueIs(CoreMetrics.SQALE_DEBT_RATIO, 0)
      .assertThatValueIs(CoreMetrics.SQALE_RATING, Rating.A);
    with(CoreMetrics.TECHNICAL_DEBT, 20)
      .assertThatValueIs(CoreMetrics.SQALE_DEBT_RATIO, 0)
      .assertThatValueIs(CoreMetrics.SQALE_RATING, Rating.A);

    // input measures are available
    with(CoreMetrics.TECHNICAL_DEBT, 20.0)
      .andText(CoreMetrics.DEVELOPMENT_COST, "0")
      .assertThatValueIs(CoreMetrics.SQALE_DEBT_RATIO, 0.0)
      .assertThatValueIs(CoreMetrics.SQALE_RATING, Rating.A);

    with(CoreMetrics.TECHNICAL_DEBT, 20.0)
      .andText(CoreMetrics.DEVELOPMENT_COST, "160")
      .assertThatValueIs(CoreMetrics.SQALE_DEBT_RATIO, 12.5)
      .assertThatValueIs(CoreMetrics.SQALE_RATING, Rating.C);

    with(CoreMetrics.TECHNICAL_DEBT, 20.0)
      .andText(CoreMetrics.DEVELOPMENT_COST, "10")
      .assertThatValueIs(CoreMetrics.SQALE_DEBT_RATIO, 200.0)
      .assertThatValueIs(CoreMetrics.SQALE_RATING, Rating.E);

    // A is 5% --> min debt is exactly 200*0.05=10
    with(CoreMetrics.DEVELOPMENT_COST, "200")
      .and(CoreMetrics.TECHNICAL_DEBT, 10.0)
      .assertThatValueIs(CoreMetrics.SQALE_DEBT_RATIO, 5.0)
      .assertThatValueIs(CoreMetrics.SQALE_RATING, Rating.A);

    with(CoreMetrics.TECHNICAL_DEBT, 0.0)
      .andText(CoreMetrics.DEVELOPMENT_COST, "0")
      .assertThatValueIs(CoreMetrics.SQALE_DEBT_RATIO, 0.0)
      .assertThatValueIs(CoreMetrics.SQALE_RATING, Rating.A);

    with(CoreMetrics.TECHNICAL_DEBT, 0.0)
      .andText(CoreMetrics.DEVELOPMENT_COST, "80")
      .assertThatValueIs(CoreMetrics.SQALE_DEBT_RATIO, 0.0);

    with(CoreMetrics.TECHNICAL_DEBT, -20.0)
      .andText(CoreMetrics.DEVELOPMENT_COST, "0")
      .assertThatValueIs(CoreMetrics.SQALE_DEBT_RATIO, 0.0)
      .assertThatValueIs(CoreMetrics.SQALE_RATING, Rating.A);

    // bug, debt can't be negative
    with(CoreMetrics.TECHNICAL_DEBT, -20.0)
      .andText(CoreMetrics.DEVELOPMENT_COST, "80")
      .assertThatValueIs(CoreMetrics.SQALE_DEBT_RATIO, 0.0)
      .assertThatValueIs(CoreMetrics.SQALE_RATING, Rating.A);

    // bug, cost can't be negative
    with(CoreMetrics.TECHNICAL_DEBT, 20.0)
      .andText(CoreMetrics.DEVELOPMENT_COST, "-80")
      .assertThatValueIs(CoreMetrics.SQALE_DEBT_RATIO, 0.0)
      .assertThatValueIs(CoreMetrics.SQALE_RATING, Rating.A);
  }

  @Test
  public void test_effort_to_reach_maintainability_rating_A() {
    withNoIssues()
      .assertThatValueIs(CoreMetrics.EFFORT_TO_REACH_MAINTAINABILITY_RATING_A, 0.0);

    // technical_debt not computed
    with(CoreMetrics.DEVELOPMENT_COST, 0.0)
      .assertThatValueIs(CoreMetrics.EFFORT_TO_REACH_MAINTAINABILITY_RATING_A, 0.0);
    with(CoreMetrics.DEVELOPMENT_COST, 20.0)
      .assertThatValueIs(CoreMetrics.EFFORT_TO_REACH_MAINTAINABILITY_RATING_A, 0.0);

    // development_cost not computed
    with(CoreMetrics.TECHNICAL_DEBT, 0.0)
      .assertThatValueIs(CoreMetrics.EFFORT_TO_REACH_MAINTAINABILITY_RATING_A, 0.0);
    with(CoreMetrics.TECHNICAL_DEBT, 20.0)
      // development cost is considered as zero, so the effort is to reach... zero
      .assertThatValueIs(CoreMetrics.EFFORT_TO_REACH_MAINTAINABILITY_RATING_A, 20.0);

    // B to A
    with(CoreMetrics.DEVELOPMENT_COST, "200")
      .and(CoreMetrics.TECHNICAL_DEBT, 40.0)
      // B is 5% --> goal is to reach 200*0.05=10 --> effort is 40-10=30
      .assertThatValueIs(CoreMetrics.EFFORT_TO_REACH_MAINTAINABILITY_RATING_A, 40.0 - (200.0 * 0.05));

    // E to A
    with(CoreMetrics.DEVELOPMENT_COST, "200")
      .and(CoreMetrics.TECHNICAL_DEBT, 180.0)
      // B is 5% --> goal is to reach 200*0.05=10 --> effort is 180-10=170
      .assertThatValueIs(CoreMetrics.EFFORT_TO_REACH_MAINTAINABILITY_RATING_A, 180.0 - (200.0 * 0.05));

    // already A
    with(CoreMetrics.DEVELOPMENT_COST, "200")
      .and(CoreMetrics.TECHNICAL_DEBT, 8.0)
      // B is 5% --> goal is to reach 200*0.05=10 --> debt is already at 8 --> effort to reach A is zero
      .assertThatValueIs(CoreMetrics.EFFORT_TO_REACH_MAINTAINABILITY_RATING_A, 0.0);

    // exactly lower range of B
    with(CoreMetrics.DEVELOPMENT_COST, "200")
      .and(CoreMetrics.TECHNICAL_DEBT, 10.0)
      // B is 5% --> goal is to reach 200*0.05=10 --> debt is 10 --> effort to reach A is zero
      // FIXME need zero to reach A but effective rating is B !
      .assertThatValueIs(CoreMetrics.EFFORT_TO_REACH_MAINTAINABILITY_RATING_A, 0.0);
  }

  @Test
  public void test_reliability_rating() {
    withNoIssues()
      .assertThatValueIs(CoreMetrics.RELIABILITY_RATING, Rating.A);

    with(
      newGroup(RuleType.BUG).setSeverity(Severity.CRITICAL).setCount(1),
      newGroup(RuleType.BUG).setSeverity(Severity.MINOR).setCount(5),
      // excluded, not a bug
      newGroup(RuleType.CODE_SMELL).setSeverity(Severity.BLOCKER).setCount(3))
      // highest severity of bugs is CRITICAL --> D
      .assertThatValueIs(CoreMetrics.RELIABILITY_RATING, Rating.D);

    with(
      newGroup(RuleType.CODE_SMELL).setSeverity(Severity.MAJOR).setCount(3),
      newGroup(RuleType.VULNERABILITY).setSeverity(Severity.CRITICAL).setCount(5))
      // no bugs --> A
      .assertThatValueIs(CoreMetrics.RELIABILITY_RATING, Rating.A);
  }

  @Test
  public void test_security_rating() {
    withNoIssues()
      .assertThatValueIs(CoreMetrics.SECURITY_RATING, Rating.A);

    with(
      newGroup(RuleType.VULNERABILITY).setSeverity(Severity.CRITICAL).setCount(1),
      newGroup(RuleType.VULNERABILITY).setSeverity(Severity.MINOR).setCount(5),
      // excluded, not a vulnerability
      newGroup(RuleType.CODE_SMELL).setSeverity(Severity.BLOCKER).setCount(3))
      // highest severity of vulnerabilities is CRITICAL --> D
      .assertThatValueIs(CoreMetrics.SECURITY_RATING, Rating.D);

    with(
      newGroup(RuleType.CODE_SMELL).setSeverity(Severity.MAJOR).setCount(3),
      newGroup(RuleType.BUG).setSeverity(Severity.CRITICAL).setCount(5))
      // no vulnerabilities --> A
      .assertThatValueIs(CoreMetrics.SECURITY_RATING, Rating.A);
  }

  @Test
  public void test_new_bugs() {
    withNoIssues().assertThatLeakValueIs(CoreMetrics.NEW_BUGS, 0.0);

    with(
      newGroup(RuleType.BUG).setInLeak(false).setSeverity(Severity.MAJOR).setCount(3),
      newGroup(RuleType.BUG).setInLeak(true).setSeverity(Severity.CRITICAL).setCount(5),
      newGroup(RuleType.BUG).setInLeak(true).setSeverity(Severity.MINOR).setCount(7),
      // not bugs
      newGroup(RuleType.CODE_SMELL).setInLeak(true).setCount(9),
      newGroup(RuleType.VULNERABILITY).setInLeak(true).setCount(11))
      .assertThatLeakValueIs(CoreMetrics.NEW_BUGS, 5 + 7);

  }

  @Test
  public void test_new_code_smells() {
    withNoIssues().assertThatLeakValueIs(CoreMetrics.NEW_CODE_SMELLS, 0.0);

    with(
      newGroup(RuleType.CODE_SMELL).setInLeak(false).setSeverity(Severity.MAJOR).setCount(3),
      newGroup(RuleType.CODE_SMELL).setInLeak(true).setSeverity(Severity.CRITICAL).setCount(5),
      newGroup(RuleType.CODE_SMELL).setInLeak(true).setSeverity(Severity.MINOR).setCount(7),
      // not code smells
      newGroup(RuleType.BUG).setInLeak(true).setCount(9),
      newGroup(RuleType.VULNERABILITY).setInLeak(true).setCount(11))
      .assertThatLeakValueIs(CoreMetrics.NEW_CODE_SMELLS, 5 + 7);
  }

  @Test
  public void test_new_vulnerabilities() {
    withNoIssues().assertThatLeakValueIs(CoreMetrics.NEW_VULNERABILITIES, 0.0);

    with(
      newGroup(RuleType.VULNERABILITY).setInLeak(false).setSeverity(Severity.MAJOR).setCount(3),
      newGroup(RuleType.VULNERABILITY).setInLeak(true).setSeverity(Severity.CRITICAL).setCount(5),
      newGroup(RuleType.VULNERABILITY).setInLeak(true).setSeverity(Severity.MINOR).setCount(7),
      // not vulnerabilities
      newGroup(RuleType.BUG).setInLeak(true).setCount(9),
      newGroup(RuleType.CODE_SMELL).setInLeak(true).setCount(11))
      .assertThatLeakValueIs(CoreMetrics.NEW_VULNERABILITIES, 5 + 7);
  }

  @Test
  public void test_new_security_hotspots() {
    withNoIssues().assertThatLeakValueIs(CoreMetrics.NEW_SECURITY_HOTSPOTS, 0);

    with(
      newGroup(RuleType.SECURITY_HOTSPOT).setInLeak(false).setSeverity(Severity.MAJOR).setCount(3),
      newGroup(RuleType.SECURITY_HOTSPOT).setInLeak(true).setSeverity(Severity.CRITICAL).setCount(5),
      newGroup(RuleType.SECURITY_HOTSPOT).setInLeak(true).setSeverity(Severity.MINOR).setCount(7),
      // not hotspots
      newGroup(RuleType.BUG).setInLeak(true).setCount(9),
      newGroup(RuleType.CODE_SMELL).setInLeak(true).setCount(11))
      .assertThatLeakValueIs(CoreMetrics.NEW_SECURITY_HOTSPOTS, 5 + 7);
  }

  @Test
  public void test_new_violations() {
    withNoIssues().assertThatLeakValueIs(CoreMetrics.NEW_VIOLATIONS, 0.0);

    with(
      newGroup(RuleType.BUG).setInLeak(true).setCount(5),
      newGroup(RuleType.CODE_SMELL).setInLeak(true).setCount(7),
      newGroup(RuleType.VULNERABILITY).setInLeak(true).setCount(9),
      // not in leak
      newGroup(RuleType.BUG).setInLeak(false).setCount(11),
      newGroup(RuleType.CODE_SMELL).setInLeak(false).setCount(13),
      newGroup(RuleType.VULNERABILITY).setInLeak(false).setCount(17))
      .assertThatLeakValueIs(CoreMetrics.NEW_VIOLATIONS, 5 + 7 + 9);
  }

  @Test
  public void test_new_blocker_violations() {
    withNoIssues()
      .assertThatLeakValueIs(CoreMetrics.NEW_BLOCKER_VIOLATIONS, 0.0);

    with(
      newGroup(RuleType.CODE_SMELL).setSeverity(Severity.BLOCKER).setInLeak(true).setCount(3),
      newGroup(RuleType.BUG).setSeverity(Severity.BLOCKER).setInLeak(true).setCount(5),
      newGroup(RuleType.VULNERABILITY).setSeverity(Severity.BLOCKER).setInLeak(true).setCount(7),
      // not blocker
      newGroup(RuleType.CODE_SMELL).setSeverity(Severity.CRITICAL).setInLeak(true).setCount(9),
      // not in leak
      newGroup(RuleType.CODE_SMELL).setSeverity(Severity.BLOCKER).setInLeak(false).setCount(11),
      newGroup(RuleType.BUG).setSeverity(Severity.BLOCKER).setInLeak(false).setCount(13))
      .assertThatLeakValueIs(CoreMetrics.NEW_BLOCKER_VIOLATIONS, 3 + 5 + 7);
  }

  @Test
  public void test_new_critical_violations() {
    withNoIssues()
      .assertThatLeakValueIs(CoreMetrics.NEW_CRITICAL_VIOLATIONS, 0.0);

    with(
      newGroup(RuleType.CODE_SMELL).setSeverity(Severity.CRITICAL).setInLeak(true).setCount(3),
      newGroup(RuleType.BUG).setSeverity(Severity.CRITICAL).setInLeak(true).setCount(5),
      newGroup(RuleType.VULNERABILITY).setSeverity(Severity.CRITICAL).setInLeak(true).setCount(7),
      // not CRITICAL
      newGroup(RuleType.CODE_SMELL).setSeverity(Severity.MAJOR).setInLeak(true).setCount(9),
      // not in leak
      newGroup(RuleType.CODE_SMELL).setSeverity(Severity.CRITICAL).setInLeak(false).setCount(11),
      newGroup(RuleType.BUG).setSeverity(Severity.CRITICAL).setInLeak(false).setCount(13))
      .assertThatLeakValueIs(CoreMetrics.NEW_CRITICAL_VIOLATIONS, 3 + 5 + 7);
  }

  @Test
  public void test_new_major_violations() {
    withNoIssues()
      .assertThatLeakValueIs(CoreMetrics.NEW_MAJOR_VIOLATIONS, 0.0);

    with(
      newGroup(RuleType.CODE_SMELL).setSeverity(Severity.MAJOR).setInLeak(true).setCount(3),
      newGroup(RuleType.BUG).setSeverity(Severity.MAJOR).setInLeak(true).setCount(5),
      newGroup(RuleType.VULNERABILITY).setSeverity(Severity.MAJOR).setInLeak(true).setCount(7),
      // not MAJOR
      newGroup(RuleType.CODE_SMELL).setSeverity(Severity.CRITICAL).setInLeak(true).setCount(9),
      // not in leak
      newGroup(RuleType.CODE_SMELL).setSeverity(Severity.MAJOR).setInLeak(false).setCount(11),
      newGroup(RuleType.BUG).setSeverity(Severity.MAJOR).setInLeak(false).setCount(13))
      .assertThatLeakValueIs(CoreMetrics.NEW_MAJOR_VIOLATIONS, 3 + 5 + 7);
  }

  @Test
  public void test_new_minor_violations() {
    withNoIssues()
      .assertThatLeakValueIs(CoreMetrics.NEW_MINOR_VIOLATIONS, 0.0);

    with(
      newGroup(RuleType.CODE_SMELL).setSeverity(Severity.MINOR).setInLeak(true).setCount(3),
      newGroup(RuleType.BUG).setSeverity(Severity.MINOR).setInLeak(true).setCount(5),
      newGroup(RuleType.VULNERABILITY).setSeverity(Severity.MINOR).setInLeak(true).setCount(7),
      // not MINOR
      newGroup(RuleType.CODE_SMELL).setSeverity(Severity.CRITICAL).setInLeak(true).setCount(9),
      // not in leak
      newGroup(RuleType.CODE_SMELL).setSeverity(Severity.MINOR).setInLeak(false).setCount(11),
      newGroup(RuleType.BUG).setSeverity(Severity.MINOR).setInLeak(false).setCount(13))
      .assertThatLeakValueIs(CoreMetrics.NEW_MINOR_VIOLATIONS, 3 + 5 + 7);
  }

  @Test
  public void test_new_info_violations() {
    withNoIssues()
      .assertThatLeakValueIs(CoreMetrics.NEW_INFO_VIOLATIONS, 0.0);

    with(
      newGroup(RuleType.CODE_SMELL).setSeverity(Severity.INFO).setInLeak(true).setCount(3),
      newGroup(RuleType.BUG).setSeverity(Severity.INFO).setInLeak(true).setCount(5),
      newGroup(RuleType.VULNERABILITY).setSeverity(Severity.INFO).setInLeak(true).setCount(7),
      // not INFO
      newGroup(RuleType.CODE_SMELL).setSeverity(Severity.CRITICAL).setInLeak(true).setCount(9),
      // not in leak
      newGroup(RuleType.CODE_SMELL).setSeverity(Severity.INFO).setInLeak(false).setCount(11),
      newGroup(RuleType.BUG).setSeverity(Severity.INFO).setInLeak(false).setCount(13))
      .assertThatLeakValueIs(CoreMetrics.NEW_INFO_VIOLATIONS, 3 + 5 + 7);
  }

  @Test
  public void test_new_accepted_issues() {
    withNoIssues()
      .assertThatLeakValueIs(CoreMetrics.NEW_ACCEPTED_ISSUES, 0);

    with(
      newGroup(RuleType.CODE_SMELL).setResolution(Issue.RESOLUTION_FALSE_POSITIVE).setInLeak(true).setCount(3),
      newGroup(RuleType.CODE_SMELL).setResolution(Issue.RESOLUTION_WONT_FIX).setInLeak(true).setCount(4),
      newGroup(RuleType.BUG).setResolution(Issue.RESOLUTION_FALSE_POSITIVE).setInLeak(true).setCount(30),
      newGroup(RuleType.BUG).setResolution(Issue.RESOLUTION_WONT_FIX).setInLeak(true).setCount(40),
      // not in leak
      newGroup(RuleType.CODE_SMELL).setResolution(Issue.RESOLUTION_WONT_FIX).setInLeak(false).setCount(5),
      newGroup(RuleType.BUG).setResolution(Issue.RESOLUTION_WONT_FIX).setInLeak(false).setCount(50))
      .assertThatLeakValueIs(CoreMetrics.NEW_ACCEPTED_ISSUES, 4 + 40);
  }

  @Test
  public void test_new_technical_debt() {
    withNoIssues().assertThatLeakValueIs(CoreMetrics.NEW_TECHNICAL_DEBT, 0.0);

    with(
      newGroup(RuleType.CODE_SMELL).setEffort(3.0).setInLeak(true),
      // not in leak
      newGroup(RuleType.CODE_SMELL).setEffort(5.0).setInLeak(false),
      // not code smells
      newGroup(RuleType.SECURITY_HOTSPOT).setEffort(9.0).setInLeak(true),
      newGroup(RuleType.BUG).setEffort(7.0).setInLeak(true),
      // exclude resolved
      newResolvedGroup(RuleType.CODE_SMELL).setEffort(17.0).setInLeak(true))
      .assertThatLeakValueIs(CoreMetrics.NEW_TECHNICAL_DEBT, 3.0);
  }

  @Test
  public void test_new_reliability_remediation_effort() {
    withNoIssues().assertThatLeakValueIs(CoreMetrics.NEW_RELIABILITY_REMEDIATION_EFFORT, 0.0);

    with(
      newGroup(RuleType.BUG).setEffort(3.0).setInLeak(true),
      // not in leak
      newGroup(RuleType.BUG).setEffort(5.0).setInLeak(false),
      // not bugs
      newGroup(RuleType.CODE_SMELL).setEffort(7.0).setInLeak(true),
      // exclude resolved
      newResolvedGroup(RuleType.BUG).setEffort(17.0).setInLeak(true))
      .assertThatLeakValueIs(CoreMetrics.NEW_RELIABILITY_REMEDIATION_EFFORT, 3.0);
  }

  @Test
  public void test_new_security_remediation_effort() {
    withNoIssues().assertThatLeakValueIs(CoreMetrics.NEW_SECURITY_REMEDIATION_EFFORT, 0.0);

    with(
      newGroup(RuleType.VULNERABILITY).setEffort(3.0).setInLeak(true),
      // not in leak
      newGroup(RuleType.VULNERABILITY).setEffort(5.0).setInLeak(false),
      // not vulnerability
      newGroup(RuleType.CODE_SMELL).setEffort(7.0).setInLeak(true),
      // exclude resolved
      newResolvedGroup(RuleType.VULNERABILITY).setEffort(17.0).setInLeak(true))
      .assertThatLeakValueIs(CoreMetrics.NEW_SECURITY_REMEDIATION_EFFORT, 3.0);
  }

  @Test
  public void test_new_reliability_rating() {
    withNoIssues().assertThatLeakValueIs(CoreMetrics.NEW_RELIABILITY_RATING, Rating.A);

    with(
      newGroup(RuleType.BUG).setSeverity(Severity.INFO).setCount(3).setInLeak(true),
      newGroup(RuleType.BUG).setSeverity(Severity.MINOR).setCount(1).setInLeak(true),
      // not in leak
      newGroup(RuleType.BUG).setSeverity(Severity.BLOCKER).setInLeak(false),
      // not bug
      newGroup(RuleType.CODE_SMELL).setSeverity(Severity.BLOCKER).setInLeak(true),
      // exclude resolved
      newResolvedGroup(RuleType.BUG).setSeverity(Severity.BLOCKER).setInLeak(true))
      // highest severity of bugs on leak period is minor -> B
      .assertThatLeakValueIs(CoreMetrics.NEW_RELIABILITY_RATING, Rating.B);
  }

  @Test
  public void test_new_security_rating() {
    withNoIssues().assertThatLeakValueIs(CoreMetrics.NEW_SECURITY_RATING, Rating.A);

    with(
      newGroup(RuleType.VULNERABILITY).setSeverity(Severity.INFO).setCount(3).setInLeak(true),
      newGroup(RuleType.VULNERABILITY).setSeverity(Severity.MINOR).setCount(1).setInLeak(true),
      // not in leak
      newGroup(RuleType.VULNERABILITY).setSeverity(Severity.BLOCKER).setInLeak(false),
      // not vulnerability
      newGroup(RuleType.CODE_SMELL).setSeverity(Severity.BLOCKER).setInLeak(true),
      // exclude resolved
      newResolvedGroup(RuleType.VULNERABILITY).setSeverity(Severity.BLOCKER).setInLeak(true))
      // highest severity of bugs on leak period is minor -> B
      .assertThatLeakValueIs(CoreMetrics.NEW_SECURITY_RATING, Rating.B);
  }

  @Test
  public void test_new_security_review_rating() {
    with(
      newGroup(RuleType.SECURITY_HOTSPOT).setStatus(Issue.STATUS_REVIEWED).setCount(3).setInLeak(true),
      newGroup(RuleType.SECURITY_HOTSPOT).setStatus(Issue.STATUS_TO_REVIEW).setCount(1).setInLeak(true),
      // not in leak
      newGroup(RuleType.SECURITY_HOTSPOT).setSeverity(Issue.STATUS_TO_REVIEW).setInLeak(false))
      .assertThatLeakValueIs(NEW_SECURITY_REVIEW_RATING, Rating.B);

    withNoIssues()
      .assertThatLeakValueIs(NEW_SECURITY_REVIEW_RATING, Rating.A);
  }

  @Test
  public void test_new_security_hotspots_reviewed() {
    with(
      newGroup(RuleType.SECURITY_HOTSPOT).setStatus(Issue.STATUS_REVIEWED).setCount(3).setInLeak(true),
      newGroup(RuleType.SECURITY_HOTSPOT).setStatus(Issue.STATUS_TO_REVIEW).setCount(1).setInLeak(true),
      // not in leak
      newGroup(RuleType.SECURITY_HOTSPOT).setStatus(Issue.STATUS_TO_REVIEW).setCount(5).setInLeak(false))
      .assertThatLeakValueIs(CoreMetrics.NEW_SECURITY_HOTSPOTS_REVIEWED, 75.0);

    withNoIssues()
      .assertNoLeakValue(CoreMetrics.NEW_SECURITY_HOTSPOTS_REVIEWED);
  }

  @Test
  public void test_new_security_hotspots_reviewed_status() {
    with(
      newGroup(RuleType.SECURITY_HOTSPOT).setStatus(Issue.STATUS_REVIEWED).setCount(3).setInLeak(true),
      newGroup(RuleType.SECURITY_HOTSPOT).setStatus(Issue.STATUS_TO_REVIEW).setCount(1).setInLeak(true),
      // not in leak
      newGroup(RuleType.SECURITY_HOTSPOT).setStatus(Issue.STATUS_TO_REVIEW).setCount(5).setInLeak(false))
      .assertThatLeakValueIs(CoreMetrics.NEW_SECURITY_HOTSPOTS_REVIEWED_STATUS, 3.0);

    withNoIssues()
      .assertThatLeakValueIs(CoreMetrics.NEW_SECURITY_HOTSPOTS_REVIEWED_STATUS, 0.0);
  }

  @Test
  public void test_new_security_hotspots_to_review_status() {
    with(
      newGroup(RuleType.SECURITY_HOTSPOT).setStatus(Issue.STATUS_REVIEWED).setCount(3).setInLeak(true),
      newGroup(RuleType.SECURITY_HOTSPOT).setStatus(Issue.STATUS_TO_REVIEW).setCount(1).setInLeak(true),
      // not in leak
      newGroup(RuleType.SECURITY_HOTSPOT).setStatus(Issue.STATUS_TO_REVIEW).setCount(5).setInLeak(false))
      .assertThatLeakValueIs(CoreMetrics.NEW_SECURITY_HOTSPOTS_TO_REVIEW_STATUS, 1.0);

    withNoIssues()
      .assertThatLeakValueIs(CoreMetrics.NEW_SECURITY_HOTSPOTS_TO_REVIEW_STATUS, 0.0);
  }

  @Test
  public void test_new_sqale_debt_ratio_and_new_maintainability_rating() {
    withNoIssues()
      .assertThatLeakValueIs(CoreMetrics.NEW_SQALE_DEBT_RATIO, 0)
      .assertThatLeakValueIs(CoreMetrics.NEW_MAINTAINABILITY_RATING, Rating.A);

    // technical_debt not computed
    with(CoreMetrics.NEW_DEVELOPMENT_COST, 0)
      .assertThatLeakValueIs(CoreMetrics.NEW_SQALE_DEBT_RATIO, 0)
      .assertThatLeakValueIs(CoreMetrics.NEW_MAINTAINABILITY_RATING, Rating.A);
    with(CoreMetrics.NEW_DEVELOPMENT_COST, 20)
      .assertThatLeakValueIs(CoreMetrics.NEW_SQALE_DEBT_RATIO, 0)
      .assertThatLeakValueIs(CoreMetrics.NEW_MAINTAINABILITY_RATING, Rating.A);

    // development_cost not computed
    with(CoreMetrics.NEW_TECHNICAL_DEBT, 0)
      .assertThatLeakValueIs(CoreMetrics.NEW_SQALE_DEBT_RATIO, 0)
      .assertThatLeakValueIs(CoreMetrics.NEW_MAINTAINABILITY_RATING, Rating.A);
    with(CoreMetrics.NEW_TECHNICAL_DEBT, 20)
      .assertThatLeakValueIs(CoreMetrics.NEW_SQALE_DEBT_RATIO, 0)
      .assertThatLeakValueIs(CoreMetrics.NEW_MAINTAINABILITY_RATING, Rating.A);

    // input measures are available
    with(CoreMetrics.NEW_TECHNICAL_DEBT, 20.0)
      .and(CoreMetrics.NEW_DEVELOPMENT_COST, 0.0)
      .assertThatLeakValueIs(CoreMetrics.NEW_SQALE_DEBT_RATIO, 0.0)
      .assertThatLeakValueIs(CoreMetrics.NEW_MAINTAINABILITY_RATING, Rating.A);

    with(CoreMetrics.NEW_TECHNICAL_DEBT, 20.0)
      .and(CoreMetrics.NEW_DEVELOPMENT_COST, 160.0)
      .assertThatLeakValueIs(CoreMetrics.NEW_SQALE_DEBT_RATIO, 12.5)
      .assertThatLeakValueIs(CoreMetrics.NEW_MAINTAINABILITY_RATING, Rating.C);

    with(CoreMetrics.NEW_TECHNICAL_DEBT, 20.0)
      .and(CoreMetrics.NEW_DEVELOPMENT_COST, 10.0D)
      .assertThatLeakValueIs(CoreMetrics.NEW_SQALE_DEBT_RATIO, 200.0)
      .assertThatLeakValueIs(CoreMetrics.NEW_MAINTAINABILITY_RATING, Rating.E);

    // A is 5% --> min debt is exactly 200*0.05=10
    with(CoreMetrics.NEW_DEVELOPMENT_COST, 200.0)
      .and(CoreMetrics.NEW_TECHNICAL_DEBT, 10.0)
      .assertThatLeakValueIs(CoreMetrics.NEW_SQALE_DEBT_RATIO, 5.0)
      .assertThatLeakValueIs(CoreMetrics.NEW_MAINTAINABILITY_RATING, Rating.A);

    with(CoreMetrics.NEW_TECHNICAL_DEBT, 0.0)
      .and(CoreMetrics.NEW_DEVELOPMENT_COST, 0.0)
      .assertThatLeakValueIs(CoreMetrics.NEW_SQALE_DEBT_RATIO, 0.0)
      .assertThatLeakValueIs(CoreMetrics.NEW_MAINTAINABILITY_RATING, Rating.A);

    with(CoreMetrics.NEW_TECHNICAL_DEBT, 0.0)
      .and(CoreMetrics.NEW_DEVELOPMENT_COST, 80.0)
      .assertThatLeakValueIs(CoreMetrics.NEW_SQALE_DEBT_RATIO, 0.0);

    with(CoreMetrics.NEW_TECHNICAL_DEBT, -20.0)
      .and(CoreMetrics.NEW_DEVELOPMENT_COST, 0.0)
      .assertThatLeakValueIs(CoreMetrics.NEW_SQALE_DEBT_RATIO, 0.0)
      .assertThatLeakValueIs(CoreMetrics.NEW_MAINTAINABILITY_RATING, Rating.A);

    // bug, debt can't be negative
    with(CoreMetrics.NEW_TECHNICAL_DEBT, -20.0)
      .and(CoreMetrics.NEW_DEVELOPMENT_COST, 80.0)
      .assertThatLeakValueIs(CoreMetrics.NEW_SQALE_DEBT_RATIO, 0.0)
      .assertThatLeakValueIs(CoreMetrics.NEW_MAINTAINABILITY_RATING, Rating.A);

    // bug, cost can't be negative
    with(CoreMetrics.NEW_TECHNICAL_DEBT, 20.0)
      .and(CoreMetrics.NEW_DEVELOPMENT_COST, -80.0)
      .assertThatLeakValueIs(CoreMetrics.NEW_SQALE_DEBT_RATIO, 0.0)
      .assertThatLeakValueIs(CoreMetrics.NEW_MAINTAINABILITY_RATING, Rating.A);
  }

  @Test
  public void compute_shouldComputeHighImpactAcceptedIssues() {
    withNoIssues()
      .assertThatValueIs(CoreMetrics.HIGH_IMPACT_ACCEPTED_ISSUES, 0);

    with(
      newImpactGroup(RELIABILITY, HIGH, 3),
      newImpactGroup(RELIABILITY, MEDIUM, 4),
      newImpactGroup(RELIABILITY, LOW, 1),
      newImpactGroup(SECURITY, HIGH, 3),
      newImpactGroup(SECURITY, HIGH, Issue.STATUS_RESOLVED, Issue.RESOLUTION_WONT_FIX, 4),
      newImpactGroup(SECURITY, MEDIUM, Issue.STATUS_RESOLVED, Issue.RESOLUTION_WONT_FIX, 5),
      newImpactGroup(SECURITY, LOW, Issue.STATUS_RESOLVED, Issue.RESOLUTION_WONT_FIX, 6),
      newImpactGroup(SECURITY, HIGH, Issue.STATUS_RESOLVED, Issue.RESOLUTION_FALSE_POSITIVE, 7),
      newImpactGroup(RELIABILITY, HIGH, Issue.STATUS_RESOLVED, Issue.RESOLUTION_WONT_FIX, 8))
      .assertThatValueIs(CoreMetrics.HIGH_IMPACT_ACCEPTED_ISSUES, 4 + 8);
  }

  @Test
  public void computeHierarchy_shouldComputeImpactMeasures() {
    new HierarchyTester(CoreMetrics.RELIABILITY_ISSUES)
      .withValue(impactMeasureToJson(6, 1, 2, 3))
      .withChildrenValues(impactMeasureToJson(6, 1, 2, 3), impactMeasureToJson(10, 5, 3, 2))
      .expectedJsonResult(impactMeasureToJson(22, 7, 7, 8));

    new HierarchyTester(CoreMetrics.RELIABILITY_ISSUES)
      .withValue(impactMeasureToJson(6, 1, 2, 3))
      .expectedJsonResult(impactMeasureToJson(6, 1, 2, 3));
  }

  @Test
  public void compute_shouldComputeImpactMeasures() {
    with(
      newImpactGroup(RELIABILITY, HIGH, 3),
      newImpactGroup(RELIABILITY, MEDIUM, 4),
      newImpactGroup(RELIABILITY, LOW, 1),
      newImpactGroup(MAINTAINABILITY, MEDIUM, 10),
      newImpactGroup(MAINTAINABILITY, LOW, 11),
      newImpactGroup(SECURITY, HIGH, 3))
      .assertThatJsonValueIs(CoreMetrics.RELIABILITY_ISSUES, impactMeasureToJson(8, 3, 4, 1))
      .assertThatJsonValueIs(CoreMetrics.MAINTAINABILITY_ISSUES, impactMeasureToJson(21, 0, 10, 11))
      .assertThatJsonValueIs(CoreMetrics.SECURITY_ISSUES, impactMeasureToJson(3, 3, 0, 0));
  }

  @Test
  public void compute_whenNoIssues_shouldComputeImpactMeasures() {
    withNoIssues()
      .assertThatJsonValueIs(CoreMetrics.RELIABILITY_ISSUES, impactMeasureToJson(0, 0, 0, 0))
      .assertThatJsonValueIs(CoreMetrics.MAINTAINABILITY_ISSUES, impactMeasureToJson(0, 0, 0, 0))
      .assertThatJsonValueIs(CoreMetrics.SECURITY_ISSUES, impactMeasureToJson(0, 0, 0, 0));
  }

  private static String impactMeasureToJson(long total, long high, long medium, long low) {
    return GSON.toJson(Map.of("total", total, "HIGH", high, "MEDIUM", medium, "LOW", low));
  }

  private Verifier with(IssueGroupDto... groups) {
    return new Verifier(groups);
  }

  private Verifier with(IssueImpactGroupDto... groups) {
    return new Verifier(groups);
  }

  private Verifier withNoIssues() {
    return new Verifier(new IssueGroupDto[0]);
  }

  private Verifier with(Metric metric, double value) {
    return new Verifier(new IssueGroupDto[0]).and(metric, value);
  }

  private Verifier with(Metric metric, String value) {
    return new Verifier(new IssueGroupDto[0]).andText(metric, value);
  }

  private class Verifier {
    private IssueGroupDto[] groups = {};
    private IssueImpactGroupDto[] impactGroups = {};
    private final InitialValues initialValues = new InitialValues();

    private Verifier(IssueGroupDto[] groups) {
      this.groups = groups;
    }

    private Verifier(IssueImpactGroupDto[] impactGroups) {
      this.impactGroups = impactGroups;
    }

    Verifier and(Metric metric, double value) {
      this.initialValues.values.put(metric, value);
      return this;
    }

    Verifier andText(Metric metric, String value) {
      this.initialValues.textValues.put(metric, value);
      return this;
    }

    Verifier assertThatValueIs(Metric metric, double expectedValue) {
      TestContext context = run(metric, false);
      assertThat(context.doubleValue).isNotNull().isEqualTo(expectedValue);
      return this;
    }

    Verifier assertThatJsonValueIs(Metric metric, String expectedValue) {
      TestContext context = run(metric, false);
      assertJson(context.stringValue).isSimilarTo(expectedValue);
      return this;
    }

    Verifier assertThatLeakValueIs(Metric metric, double expectedValue) {
      TestContext context = run(metric, true);
      assertThat(context.doubleValue).isNotNull().isEqualTo(expectedValue);
      return this;
    }

    Verifier assertThatLeakValueIs(Metric metric, Rating expectedRating) {
      TestContext context = run(metric, true);
      assertThat(context.ratingValue).isNotNull().isEqualTo(expectedRating);
      return this;
    }

    Verifier assertNoLeakValue(Metric metric) {
      TestContext context = run(metric, true);
      assertThat(context.ratingValue).isNull();
      return this;
    }

    Verifier assertThatValueIs(Metric metric, Rating expectedValue) {
      TestContext context = run(metric, false);
      assertThat(context.ratingValue).isNotNull().isEqualTo(expectedValue);
      return this;
    }

    Verifier assertNoValue(Metric metric) {
      TestContext context = run(metric, false);
      assertThat(context.ratingValue).isNull();
      return this;
    }

    private TestContext run(Metric metric, boolean expectLeakFormula) {
      MeasureUpdateFormula formula = underTest.getFormulas().stream()
        .filter(f -> f.getMetric().getKey().equals(metric.getKey()))
        .findFirst()
        .get();
      assertThat(formula.isOnLeak()).isEqualTo(expectLeakFormula);
      TestContext context = new TestContext(formula.getDependentMetrics(), initialValues);
      formula.compute(context, newIssueCounter(groups, impactGroups));
      return context;
    }
  }

  private static IssueCounter newIssueCounter(IssueGroupDto[] groups, IssueImpactGroupDto[] impactGroups) {
    return new IssueCounter(asList(groups), asList(impactGroups));
  }

  private static IssueGroupDto newGroup() {
    return newGroup(RuleType.CODE_SMELL);
  }

  private static IssueGroupDto newGroup(RuleType ruleType) {
    IssueGroupDto dto = new IssueGroupDto();
    // set non-null fields
    dto.setRuleType(ruleType.getDbConstant());
    dto.setCount(1);
    dto.setEffort(0.0);
    dto.setSeverity(Severity.INFO);
    dto.setStatus(Issue.STATUS_OPEN);
    dto.setInLeak(false);
    return dto;
  }

  private static IssueImpactGroupDto newImpactGroup(SoftwareQuality softwareQuality, org.sonar.api.issue.impact.Severity severity,
                                                    String status, @Nullable String resolution, long count) {
    IssueImpactGroupDto dto = new IssueImpactGroupDto();
    dto.setSoftwareQuality(softwareQuality);
    dto.setSeverity(severity);
    dto.setStatus(status);
    dto.setResolution(resolution);
    dto.setCount(count);
    return dto;
  }

  private static IssueImpactGroupDto newImpactGroup(SoftwareQuality softwareQuality, org.sonar.api.issue.impact.Severity severity, long count) {
    return newImpactGroup(softwareQuality, severity, Issue.STATUS_OPEN, null, count);
  }

  private static IssueGroupDto newResolvedGroup(RuleType ruleType) {
    return newGroup(ruleType).setResolution(Issue.RESOLUTION_FALSE_POSITIVE).setStatus(Issue.STATUS_CLOSED);
  }

  private static IssueGroupDto newResolvedGroup(String resolution, String status) {
    return newGroup().setResolution(resolution).setStatus(status);
  }

  private static class TestContext implements MeasureUpdateFormula.Context {
    private final Set<Metric> dependentMetrics;
    private final InitialValues initialValues;
    private Double doubleValue;
    private Rating ratingValue;
    private String stringValue;

    private TestContext(Collection<Metric> dependentMetrics, InitialValues initialValues) {
      this.dependentMetrics = new HashSet<>(dependentMetrics);
      this.initialValues = initialValues;
    }

    @Override
    public List<Double> getChildrenValues() {
      return initialValues.childrenValues;
    }

    @Override
    public List<String> getChildrenTextValues() {
      return initialValues.childrenTextValues;
    }

    @Override
    public long getChildrenHotspotsReviewed() {
      return initialValues.childrenHotspotsReviewed;
    }

    @Override
    public long getChildrenHotspotsToReview() {
      return initialValues.childrenHotspotsToReview;
    }

    @Override
    public long getChildrenNewHotspotsReviewed() {
      return initialValues.childrenNewHotspotsReviewed;
    }

    @Override
    public long getChildrenNewHotspotsToReview() {
      return initialValues.childrenNewHotspotsToReview;
    }

    @Override
    public ComponentDto getComponent() {
      throw new UnsupportedOperationException();
    }

    @Override
    public DebtRatingGrid getDebtRatingGrid() {
      return new DebtRatingGrid(new double[] {0.05, 0.1, 0.2, 0.5});
    }

    @Override
    public Optional<Double> getValue(Metric metric) {
      if (!dependentMetrics.contains(metric)) {
        throw new IllegalStateException("Metric " + metric.getKey() + " is not declared as a dependency");
      }
      if (initialValues.values.containsKey(metric)) {
        return Optional.of(initialValues.values.get(metric));
      }
      return Optional.empty();
    }

    @Override
    public Optional<String> getText(Metric metric) {
      if (initialValues.textValues.containsKey(metric)) {
        return Optional.of(initialValues.textValues.get(metric));
      }
      return Optional.empty();
    }

    @Override
    public void setValue(double value) {
      this.doubleValue = value;
    }

    @Override
    public void setValue(Rating value) {
      this.ratingValue = value;
    }

    @Override
    public void setValue(String value) {
      this.stringValue = value;
    }
  }

  private class InitialValues {
    private final Map<Metric, Double> values = new HashMap<>();
    private final List<Double> childrenValues = new ArrayList<>();
    private final Map<Metric, String> textValues = new HashMap<>();
    private final List<String> childrenTextValues = new ArrayList<>();
    private long childrenHotspotsReviewed = 0;
    private long childrenNewHotspotsReviewed = 0;
    private long childrenHotspotsToReview = 0;
    private long childrenNewHotspotsToReview = 0;

  }

  private class HierarchyTester {
    private final Metric metric;
    private final InitialValues initialValues;
    private final MeasureUpdateFormula formula;

    public HierarchyTester(Metric metric) {
      this.metric = metric;
      this.initialValues = new InitialValues();
      this.formula = underTest.getFormulas().stream().filter(f -> f.getMetric().equals(metric)).findAny().get();
    }

    public HierarchyTester withValue(Metric metric, Double value) {
      this.initialValues.values.put(metric, value);
      return this;
    }

    public HierarchyTester withValue(Metric metric, String value) {
      this.initialValues.textValues.put(metric, value);
      return this;
    }

    public HierarchyTester withChildrenHotspotsCounts(long childrenHotspotsReviewed, long childrenNewHotspotsReviewed, long childrenHotspotsToReview,
      long childrenNewHotspotsToReview) {
      this.initialValues.childrenHotspotsReviewed = childrenHotspotsReviewed;
      this.initialValues.childrenNewHotspotsReviewed = childrenNewHotspotsReviewed;
      this.initialValues.childrenHotspotsToReview = childrenHotspotsToReview;
      this.initialValues.childrenNewHotspotsToReview = childrenNewHotspotsToReview;
      return this;
    }

    public HierarchyTester withValue(Double value) {
      return withValue(metric, value);
    }

    public HierarchyTester withValue(String value) {
      return withValue(metric, value);
    }

    public HierarchyTester withChildrenValues(Double... values) {
      this.initialValues.childrenValues.addAll(asList(values));
      return this;
    }

    public HierarchyTester withChildrenValues(String... values) {
      this.initialValues.childrenTextValues.addAll(asList(values));
      return this;
    }

    public HierarchyTester expectedResult(@Nullable Double expected) {
      TestContext ctx = run();
      assertThat(ctx.doubleValue).isEqualTo(expected);
      return this;
    }

    public HierarchyTester expectedJsonResult(@Nullable String expected) {
      TestContext ctx = run();
      assertJson(ctx.stringValue).isSimilarTo(expected);
      return this;
    }

    public HierarchyTester expectedRating(@Nullable Rating rating) {
      TestContext ctx = run();
      assertThat(ctx.ratingValue).isEqualTo(rating);
      return this;
    }

    private TestContext run() {
      List<Metric> deps = new LinkedList<>(formula.getDependentMetrics());
      deps.add(formula.getMetric());
      deps.addAll(initialValues.values.keySet());
      deps.addAll(initialValues.textValues.keySet());
      TestContext context = new TestContext(deps, initialValues);
      formula.computeHierarchy(context);
      return context;
    }
  }
}
