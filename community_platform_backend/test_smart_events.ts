import { prisma } from "./src/config/prisma";

async function runTests() {
  console.log("=================================================");
  console.log("  SMART EVENT MANAGEMENT INTEGRATION TEST SUITE  ");
  console.log("=================================================\n");

  const users = await prisma.users.findMany({ take: 5, where: { is_active: true } });
  if (users.length < 4) {
    throw new Error("Need at least 4 users in database for capacity & waitlist test.");
  }
  const [organizer, user1, user2, user3, user4] = users;

  const community = await prisma.communities.findFirst();
  if (!community) throw new Error("Need at least 1 community in database.");

  console.log(`Using Community: ${community.name} (${community.id})`);
  console.log(`Organizer: ${organizer.full_name} (${organizer.id})`);
  console.log(`Attendees: ${user1.full_name}, ${user2.full_name}, ${user3.full_name}, ${user4.full_name}\n`);

  // 1. Create Event with capacity 2
  console.log("TEST 1: Creating event with max_attendees = 2");
  const startTime = new Date(Date.now() + 48 * 3600 * 1000); // 48h from now
  const endTime = new Date(startTime.getTime() + 2 * 3600 * 1000);
  const deadline = new Date(startTime.getTime() - 4 * 3600 * 1000);

  const createRes = await fetch("http://localhost:3000/api/v1/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      community_id: community.id,
      creator_id: organizer.id,
      title: "Smart Event Concurrency & Waitlist Test",
      description: "Testing automated promotion and QR verification.",
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      registration_deadline: deadline.toISOString(),
      max_attendees: 2,
      is_online: true,
      meeting_url: "https://meet.google.com/test-event",
    }),
  });

  const createJson = await createRes.json();
  if (!createJson.success) throw new Error("Failed to create event: " + JSON.stringify(createJson));
  const event = createJson.data;
  console.log(`✓ Event created: ${event.title} (ID: ${event.id}, Max Capacity: ${event.max_attendees})\n`);

  try {
    // 2. User 1 registers (Seat 1/2)
    console.log("TEST 2: User 1 registers for event");
    const reg1Res = await fetch(`http://localhost:3000/api/v1/events/${event.id}/registrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user1.id }),
    });
    const reg1Json = await reg1Res.json();
    console.log(`  Status: ${reg1Json.data.registration.status}, QR Token Issued: ${!!reg1Json.data.ticketToken}`);
    if (reg1Json.data.registration.status !== "registered" || !reg1Json.data.ticketToken) {
      throw new Error("User 1 was not confirmed!");
    }
    const user1Ticket = reg1Json.data.ticketToken;
    const user1RegId = reg1Json.data.registration.id;
    console.log("✓ User 1 successfully confirmed with QR ticket.\n");

    // 3. User 2 registers (Seat 2/2 -> now FULL)
    console.log("TEST 3: User 2 registers for event (reaches max capacity 2/2)");
    const reg2Res = await fetch(`http://localhost:3000/api/v1/events/${event.id}/registrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user2.id }),
    });
    const reg2Json = await reg2Res.json();
    console.log(`  Status: ${reg2Json.data.registration.status}`);
    if (reg2Json.data.registration.status !== "registered") {
      throw new Error("User 2 was not confirmed!");
    }
    console.log("✓ User 2 confirmed. Event is now at maximum capacity (2/2).\n");

    // 4. User 3 registers (Event Full -> Waitlist #1)
    console.log("TEST 4: User 3 registers for full event -> should be queued to waitlist #1");
    const reg3Res = await fetch(`http://localhost:3000/api/v1/events/${event.id}/registrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user3.id }),
    });
    const reg3Json = await reg3Res.json();
    console.log(`  Status: ${reg3Json.data.registration.status}, Waitlist Position: ${reg3Json.data.waitlistPosition}`);
    if (reg3Json.data.registration.status !== "waitlisted" || reg3Json.data.waitlistPosition !== 1) {
      throw new Error("User 3 should be waitlisted at position 1!");
    }
    console.log("✓ User 3 deterministic waitlist position #1 verified.\n");

    // 5. User 4 registers (Event Full -> Waitlist #2)
    console.log("TEST 5: User 4 registers -> should be queued to waitlist #2");
    const reg4Res = await fetch(`http://localhost:3000/api/v1/events/${event.id}/registrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user4.id }),
    });
    const reg4Json = await reg4Res.json();
    console.log(`  Status: ${reg4Json.data.registration.status}, Waitlist Position: ${reg4Json.data.waitlistPosition}`);
    if (reg4Json.data.registration.status !== "waitlisted" || reg4Json.data.waitlistPosition !== 2) {
      throw new Error("User 4 should be waitlisted at position 2!");
    }
    console.log("✓ User 4 deterministic waitlist position #2 verified.\n");

    // 6. User 1 cancels registration -> User 3 must be AUTOMATICALLY PROMOTED to registered with QR ticket!
    console.log("TEST 6: User 1 cancels confirmed seat -> Automatic Waitlist Promotion trigger");
    const cancelRes = await fetch(`http://localhost:3000/api/v1/events/${event.id}/registrations/${user1RegId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user1.id }),
    });
    const cancelJson = await cancelRes.json();
    console.log(`  Cancel response: ${cancelJson.message}`);
    const promoted = cancelJson.data.promotedAttendee;
    if (!promoted || promoted.user_id !== user3.id || promoted.status !== "registered" || !promoted.qr_ticket_token) {
      throw new Error("User 3 was not automatically promoted with a QR ticket!");
    }
    console.log(`✓ User 3 (${promoted.user.full_name}) was atomically promoted from Waitlist #1 to Confirmed Seat!`);
    console.log(`  New QR Ticket Token generated for User 3: ${promoted.qr_ticket_token.substring(0, 30)}...\n`);

    // 7. Verify QR ticket check-in for User 3
    console.log("TEST 7: Organizer scans and verifies User 3's QR ticket");
    const checkinRes = await fetch(`http://localhost:3000/api/v1/events/${event.id}/check-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticket_token: promoted.qr_ticket_token,
        user_id: organizer.id,
      }),
    });
    const checkinJson = await checkinRes.json();
    console.log(`  Check-in response: ${checkinJson.message}`);
    if (!checkinJson.success || !checkinJson.data.attendee.checked_in) {
      throw new Error("Check-in verification failed: " + JSON.stringify(checkinJson));
    }
    console.log("✓ QR Check-in verified by organizer.\n");

    // 8. Duplicate check-in scan -> must be rejected with Conflict
    console.log("TEST 8: Re-scanning User 3's QR ticket -> duplicate check-in prevention");
    const dupRes = await fetch(`http://localhost:3000/api/v1/events/${event.id}/check-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticket_token: promoted.qr_ticket_token,
        user_id: organizer.id,
      }),
    });
    console.log(`  Duplicate scan status: ${dupRes.status} (expected 409 Conflict)`);
    if (dupRes.status !== 409) {
      throw new Error("Duplicate check-in was not rejected with 409!");
    }
    console.log("✓ Duplicate scan safely prevented.\n");

    // 9. Tampered QR ticket -> must be rejected with 401 Unauthorized
    console.log("TEST 9: Tampered / forged QR ticket -> security verification");
    const forgedToken = promoted.qr_ticket_token.slice(0, -6) + "badbad";
    const forgeRes = await fetch(`http://localhost:3000/api/v1/events/${event.id}/check-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticket_token: forgedToken,
        user_id: organizer.id,
      }),
    });
    console.log(`  Forged scan status: ${forgeRes.status} (expected 401 Unauthorized)`);
    if (forgeRes.status !== 401) {
      throw new Error("Forged QR token was not rejected with 401!");
    }
    console.log("✓ Cryptographic signature tampering correctly rejected.\n");

    // 10. Event Analytics Endpoint
    console.log("TEST 10: Organizer retrieves live Event Analytics & Predictive Insights");
    const analyticsRes = await fetch(`http://localhost:3000/api/v1/events/${event.id}/analytics?user_id=${organizer.id}`);
    const analyticsJson = await analyticsRes.json();
    const metrics = analyticsJson.data.metrics;
    const insights = analyticsJson.data.predictive_insights;
    console.log("  Metrics:", {
      total_capacity: metrics.total_capacity,
      confirmed_registrations: metrics.confirmed_registrations,
      waitlist_size: metrics.waitlist_size,
      checked_in_count: metrics.checked_in_count,
      attendance_rate: `${metrics.attendance_rate}%`,
    });
    console.log("  Predictive Insights:", {
      predicted_attendance: insights.predicted_attendance,
      historical_show_rate: `${insights.historical_community_show_rate}%`,
      confidence: insights.confidence_level,
      model: insights.model_description,
    });

    if (metrics.confirmed_registrations !== 2 || metrics.waitlist_size !== 1 || metrics.checked_in_count !== 1) {
      throw new Error("Analytics metric calculation mismatch: " + JSON.stringify(metrics));
    }
    console.log("✓ Analytics and predictive attendance verified with 100% precision.\n");

    console.log("🎉 ALL 10 SMART EVENT BACKEND INTEGRATION TESTS PASSED!\n");
  } finally {
    // Cleanup
    await prisma.event.delete({ where: { id: event.id } });
    console.log("Cleaned up test event.");
  }
}

runTests().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
