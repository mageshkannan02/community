import { prisma } from "./src/config/prisma";

async function runEditDeleteTest() {
  console.log("=================================================");
  console.log("   EVENT EDIT & DELETE INTEGRATION TEST SUITE   ");
  console.log("=================================================\n");

  const organizer = await prisma.users.findFirst({ where: { is_active: true } });
  if (!organizer) throw new Error("Need an active user in database.");

  const community = await prisma.communities.findFirst();
  if (!community) throw new Error("Need at least 1 community in database.");

  // Step 1: Create an event
  console.log("1. Creating test event...");
  const startTime = new Date(Date.now() + 24 * 3600 * 1000);
  const endTime = new Date(startTime.getTime() + 3 * 3600 * 1000);

  const createRes = await fetch("http://localhost:3000/api/v1/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      community_id: community.id,
      creator_id: organizer.id,
      title: "Original Event Title",
      description: "Original Description",
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      max_attendees: 10,
      is_online: true,
      meeting_url: "https://meet.google.com/original",
      status: "published",
    }),
  });

  const createJson = await createRes.json();
  if (!createJson.success) throw new Error("Event creation failed: " + JSON.stringify(createJson));
  const eventId = createJson.data.id;
  console.log(`✓ Event created: ID ${eventId}\n`);

  // Step 2: Edit the event
  console.log("2. Editing event details (title, description, capacity, status)...");
  const updateRes = await fetch(`http://localhost:3000/api/v1/events/${eventId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: organizer.id,
      title: "Updated Event Title (Edited)",
      description: "Updated Description with new details",
      max_attendees: 25,
      meeting_url: "https://meet.google.com/updated",
      status: "published",
    }),
  });

  const updateJson = await updateRes.json();
  if (!updateJson.success) throw new Error("Event update failed: " + JSON.stringify(updateJson));
  console.log(`✓ Event updated successfully:`);
  console.log(`  - New Title: "${updateJson.data.title}"`);
  console.log(`  - New Capacity: ${updateJson.data.max_attendees}`);
  console.log(`  - New Meeting Link: ${updateJson.data.meeting_link}`);

  if (updateJson.data.title !== "Updated Event Title (Edited)") {
    throw new Error("Title did not update correctly!");
  }
  if (updateJson.data.max_attendees !== 25) {
    throw new Error("Max attendees did not update correctly!");
  }
  console.log("");

  // Step 3: Fetch updated event to verify persistence
  console.log("3. Verifying persisted event state from GET /api/v1/events/:id...");
  const fetchRes = await fetch(`http://localhost:3000/api/v1/events/${eventId}`);
  const fetchJson = await fetchRes.json();
  if (!fetchJson.success) throw new Error("Failed to fetch event: " + JSON.stringify(fetchJson));
  if (fetchJson.data.title !== "Updated Event Title (Edited)") {
    throw new Error("Persisted title does not match updated title!");
  }
  console.log(`✓ Verified persisted event: "${fetchJson.data.title}"\n`);

  // Step 4: Delete the event
  console.log("4. Deleting event via DELETE /api/v1/events/:id...");
  const deleteRes = await fetch(`http://localhost:3000/api/v1/events/${eventId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: organizer.id }),
  });

  const deleteJson = await deleteRes.json();
  if (!deleteJson.success) throw new Error("Event delete failed: " + JSON.stringify(deleteJson));
  console.log(`✓ Event deleted: ${deleteJson.message}\n`);

  // Step 5: Verify event no longer exists
  console.log("5. Verifying event deletion from database...");
  const verifyRes = await fetch(`http://localhost:3000/api/v1/events/${eventId}`);
  const verifyJson = await verifyRes.json();
  if (verifyRes.status === 404 || !verifyJson.success || !verifyJson.data) {
    console.log("✓ Event verified absent (404 / null as expected).\n");
  } else {
    throw new Error("Event was still found after deletion!");
  }

  console.log("=================================================");
  console.log("  ALL EDIT & DELETE TESTS COMPLETED SUCCESSFULLY! ");
  console.log("=================================================");
}

runEditDeleteTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
