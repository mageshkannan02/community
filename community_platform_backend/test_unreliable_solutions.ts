import dotenv from "dotenv";
dotenv.config();

import { prisma } from "./src/config/prisma";
import * as solutionValidationService from "./src/services/solution_validation_service";

async function runTests() {
  console.log("===================================================================");
  console.log("🧪 PHASE 5: DETECTING UNRELIABLE SOLUTIONS - AUTOMATED TEST SUITE");
  console.log("===================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      if (detail) console.error("   Details:", detail);
      failed++;
    }
  }

  try {
    // 1. Setup test users and community
    console.log("Step 1: Setting up test environment (Users, Community, Discussion)...");
    const role = await prisma.rolesMaster.findFirst();
    const roleId = role?.id || "11111111-1111-4111-a111-111111111111";

    const testOP = await prisma.users.upsert({
      where: { email: "op_author@test.com" },
      update: {},
      create: {
        email: "op_author@test.com",
        password: "Password123!",
        full_name: "Original Poster",
        role_id: roleId,
        updated_at: new Date(),
      },
    });

    const userAlice = await prisma.users.upsert({
      where: { email: "alice_tester@test.com" },
      update: {},
      create: {
        email: "alice_tester@test.com",
        password: "Password123!",
        full_name: "Alice Tester",
        role_id: roleId,
        updated_at: new Date(),
      },
    });

    const userBob = await prisma.users.upsert({
      where: { email: "bob_developer@test.com" },
      update: {},
      create: {
        email: "bob_developer@test.com",
        password: "Password123!",
        full_name: "Bob Developer",
        role_id: roleId,
        updated_at: new Date(),
      },
    });

    const userCharlie = await prisma.users.upsert({
      where: { email: "charlie_dev@test.com" },
      update: {},
      create: {
        email: "charlie_dev@test.com",
        password: "Password123!",
        full_name: "Charlie Dev",
        role_id: roleId,
        updated_at: new Date(),
      },
    });

    let community = await prisma.communities.findFirst();
    if (!community) {
      community = await prisma.communities.create({
        data: {
          name: "Test Developer Community",
          description: "A community for technical discussions and verified solutions",
          owner_id: testOP.id,
          updated_at: new Date(),
        },
      });
    }

    // Create a problem discussion
    const discussion = await prisma.discussions.create({
      data: {
        community_id: community.id,
        author_id: testOP.id,
        title: "How to handle Server Actions revalidation in Next.js 16 with streaming?",
        content: "I am experiencing caching conflicts when revalidating tags during streamed Suspense responses in Next.js 16.",
      },
    });

    console.log(`Created discussion ${discussion.id} by OP ${testOP.full_name}\n`);

    // 2. Create Solution 1: Legacy Answer that is Popular but Broken in latest framework
    console.log("Step 2: Simulating Popular Answer (Solution 1) that is broken in latest framework...");
    const replyLegacy = await prisma.discussionReply.create({
      data: {
        discussionId: discussion.id,
        authorId: userBob.id,
        content: "Just use `revalidateTag(tag)` directly inside the component body before rendering. It always worked for me in Next 13/14!",
        upvotes: 42, // Highly upvoted by community historically!
      },
    });

    // 3. Create Solution 2: Modern Verified Solution
    console.log("Step 3: Creating Modern Verified Solution (Solution 2)...");
    const replyModern = await prisma.discussionReply.create({
      data: {
        discussionId: discussion.id,
        authorId: userCharlie.id,
        content: "In Next.js 16+, you must trigger `revalidateTag` inside an asynchronous Server Action or Route Handler, and wrap streaming components in `<Suspense fallback={...}>` with unique keys.",
        upvotes: 8,
      },
    });

    // TEST 1: Popularity vs Demonstrated Effectiveness Initial State
    console.log("\n--- TEST 1: Initial Reliability State ---");
    const legacyInitial = await solutionValidationService.getReplyValidationMetrics(replyLegacy.id);
    assert(
      legacyInitial.upvotes === 42 && legacyInitial.reliability_tier === "UNVERIFIED" && !legacyInitial.outdated_indicator,
      "Legacy reply starts with 42 upvotes and UNVERIFIED tier before reports"
    );

    // TEST 2: Users report that Legacy solution fails on latest framework version
    console.log("\n--- TEST 2: Users Report Failure on Latest Framework ---");
    const aliceFailReport = await solutionValidationService.submitValidationReport(
      replyLegacy.id,
      userAlice.id,
      {
        worked: false,
        environment_info: "Next.js 16.2.0, Node.js 22.12.0, React 19",
        version_tested: "16.2.0",
        attempt_notes: "Calling revalidateTag during component render throws DynamicServerError: Server Functions cannot be called during SSR.",
        evidence_text: "Error: revalidateTag cannot be called inside a Client or Server Component render pass.",
        is_outdated_report: true,
      }
    );

    assert(aliceFailReport.report.worked === false, "Alice successfully submitted failure validation report");
    assert(aliceFailReport.report.version_tested === "16.2.0", "Version tested recorded correctly");

    const charlieFailReport = await solutionValidationService.submitValidationReport(
      replyLegacy.id,
      userCharlie.id,
      {
        worked: false,
        environment_info: "Next.js 16.3-canary, Docker Linux",
        version_tested: "16.3-canary",
        attempt_notes: "Breaks streaming suspense boundary with unhandled promise rejection.",
        evidence_text: "Failed attempt log: Error: headers() or cookies() called during static generation.",
        is_outdated_report: true,
      }
    );

    assert(charlieFailReport.report.worked === false, "Charlie submitted second failure validation report");

    // TEST 3: System identifies outdated popular solution & distinguishes popularity from effectiveness
    console.log("\n--- TEST 3: Outdated / Unreliable Solution Identification ---");
    const legacyMetricsAfterReports = await solutionValidationService.getReplyValidationMetrics(replyLegacy.id);
    assert(
      legacyMetricsAfterReports.upvotes === 42,
      "Reply retains high community popularity (42 upvotes)"
    );
    assert(
      legacyMetricsAfterReports.reliability_tier === "OUTDATED_UNRELIABLE",
      "Reply is automatically classified as OUTDATED_UNRELIABLE due to demonstrated failure outcomes"
    );
    assert(
      legacyMetricsAfterReports.outdated_indicator === true,
      "outdated_indicator is TRUE (warns users that high popularity does not equal demonstrated effectiveness)"
    );
    assert(
      legacyMetricsAfterReports.is_flagged_for_review === true,
      "Solution was automatically flagged for review due to repeated framework failures"
    );

    // TEST 4: Submitting successful validation attempts for Modern Solution
    console.log("\n--- TEST 4: Validating Modern Solution with Evidence ---");
    const aliceSuccessReport = await solutionValidationService.submitValidationReport(
      replyModern.id,
      userAlice.id,
      {
        worked: true,
        environment_info: "Next.js 16.2.0, TypeScript 5.6",
        version_tested: "16.2.0",
        attempt_notes: "Successfully revalidated cached tags without streaming interruption.",
        evidence_text: "All 12 Server Action tests passed with 200 OK and instant cache invalidation.",
      }
    );
    assert(aliceSuccessReport.report.worked === true, "Alice reported success on modern solution with evidence");

    const bobSuccessReport = await solutionValidationService.submitValidationReport(
      replyModern.id,
      userBob.id,
      {
        worked: true,
        environment_info: "Next.js 16.1.4, Ubuntu 24.04 LTS",
        version_tested: "16.1.4",
        attempt_notes: "Confirmed working in our production canary deployment.",
        evidence_text: "Cache-Control: s-maxage=60, stale-while-revalidate properly updated.",
      }
    );
    assert(bobSuccessReport.report.worked === true, "Bob reported success on modern solution");

    // TEST 5: Original Poster (OP) confirms resolution
    console.log("\n--- TEST 5: Original Poster (OP) Resolution Confirmation ---");
    // Verify unauthorized user cannot confirm as OP
    let unauthorizedBlocked = false;
    try {
      await solutionValidationService.confirmOpResolution(replyModern.id, userAlice.id, {
        confirmation_note: "I am not OP but confirming anyway",
      });
    } catch (err: any) {
      unauthorizedBlocked = true;
    }
    assert(unauthorizedBlocked, "Non-OP users are strictly rejected from confirming OP resolution");

    // OP confirms resolution
    const opConfirmation = await solutionValidationService.confirmOpResolution(
      replyModern.id,
      testOP.id,
      {
        confirmation_note: "Thank you Charlie! This completely solved our streaming revalidation issue on Next 16.",
      }
    );
    assert(opConfirmation.is_op_confirmed === true, "Original poster confirmed solution resolution");
    assert(
      opConfirmation.op_confirmation_note?.includes("completely solved") ?? false,
      "OP confirmation note stored accurately"
    );

    // Check modern reply reliability metrics
    const modernMetrics = await solutionValidationService.getReplyValidationMetrics(replyModern.id);
    assert(
      modernMetrics.reliability_tier === "VERIFIED_EFFECTIVE",
      "Modern solution classified as VERIFIED_EFFECTIVE"
    );
    assert(
      modernMetrics.success_rate === 100,
      "Modern solution has 100% success rate across reported attempts"
    );
    assert(
      modernMetrics.is_op_confirmed === true,
      "OP confirmed badge is active"
    );

    // TEST 6: Solution Upvote toggling (Separating votes from outcomes)
    console.log("\n--- TEST 6: Independent Popularity Upvotes ---");
    const upvoteResult = await solutionValidationService.toggleSolutionUpvote(replyModern.id, userAlice.id);
    assert(upvoteResult.upvoted === true && upvoteResult.upvotes === 9, "Upvote toggled ON (8 -> 9)");
    const upvoteRemove = await solutionValidationService.toggleSolutionUpvote(replyModern.id, userAlice.id);
    assert(upvoteRemove.upvoted === false && upvoteRemove.upvotes === 8, "Upvote toggled OFF (9 -> 8)");

    // TEST 7: Platform Evaluation Metrics
    console.log("\n--- TEST 7: Evaluation Metrics (Outcome Confirmation & Detection Time) ---");
    const evaluation = await solutionValidationService.getDiscussionSolutionEvaluations(discussion.id);

    console.log("Evaluation Results:", {
      total_solutions: evaluation.total_solutions_analyzed,
      solutions_with_confirmed_outcomes: evaluation.solutions_with_confirmed_outcomes,
      confirmed_outcome_percentage: `${evaluation.confirmed_outcome_percentage}%`,
      unreliable_or_outdated_count: evaluation.unreliable_or_outdated_count,
      popular_but_unreliable_count: evaluation.popular_but_unreliable_count,
      average_time_to_detect_outdated_hours: evaluation.average_time_to_detect_outdated_hours,
      reliability_breakdown: evaluation.reliability_breakdown,
    });

    assert(
      evaluation.total_solutions_analyzed === 2,
      "Evaluated 2 solutions in discussion"
    );
    assert(
      evaluation.solutions_with_confirmed_outcomes === 2,
      "Both solutions have confirmed outcomes (either OP confirmed or user validation reports)"
    );
    assert(
      evaluation.confirmed_outcome_percentage === 100,
      "100% of solutions have confirmed community outcomes"
    );
    assert(
      evaluation.popular_but_unreliable_count === 1,
      "Successfully detected 1 popular-yet-unreliable solution"
    );
    assert(
      evaluation.reliability_breakdown.verified_effective === 1 &&
      evaluation.reliability_breakdown.outdated_unreliable === 1,
      "Reliability breakdown distinguishes 1 verified effective vs 1 outdated unreliable"
    );
    assert(
      evaluation.average_time_to_detect_outdated_hours !== null &&
      evaluation.average_time_to_detect_outdated_hours >= 0,
      "Time required to identify outdated answers measured accurately"
    );

    // Cleanup test data
    console.log("\nCleaning up test discussion...");
    await prisma.discussions.delete({ where: { id: discussion.id } });

    console.log("\n===================================================================");
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("===================================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Test execution failed with exception:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
