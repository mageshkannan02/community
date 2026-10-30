import { prisma } from "../src/config/prisma";
import { saveDiscussionEmbedding } from "../src/services/embedding_service";

interface ScenarioData {
  title: string;
  content: string;
  communityName: string;
  communityDescription: string;
  tags: string[];
  solutionContent: string;
  opConfirmationNote: string;
  upvotes: number;
}

const SCENARIOS: ScenarioData[] = [
  {
    title: "My electricity bill has suddenly increased even though my usage hasn't changed",
    content: "My electricity bill jumped by 65% this billing cycle even though daily habits and thermostat settings remained identical at 72°F. I live in a single-family home with standard appliances. Has anyone experienced this kind of sudden spike without clear reason, and how did you diagnose the issue?",
    communityName: "Smart Living, Energy & Household Diagnostics",
    communityDescription: "Community space for diagnosing household energy spikes, IoT monitoring, and appliance troubleshooting.",
    tags: ["Household", "Diagnostics", "Energy"],
    solutionContent: `**Diagnosis and Confirmed Solution: Grounded Water Heater Heating Element**

Tested the dual-element electric water heater with an amp clamp meter. The bottom heating element's thermostat was fused closed in an open-ground fault, continuously pulling 4.5 kW 24/7 without tripping any circuit breakers. Replacing the element ($24 part) dropped daily kWh consumption back to normal immediately.

### Reproducible Step-by-Step Resolution:
1. **Safety First**: Turn off the double-pole water heater circuit breaker at the main electrical panel. Verify zero voltage at the upper and lower thermostats with a non-contact voltage tester.
2. **Resistance Test**: Disconnect the two wires from the lower heating element. Using a digital multimeter set to Ohms (Ω), measure across the two screw terminals. A standard 4500W element should measure approximately 12.8 Ω.
3. **Ground Fault Check**: Measure between either terminal screw and the bare metal water tank casing. Any reading other than infinite resistance (O.L) indicates an internal fracture allowing current to bleed directly to ground.
4. **Replacement**: Drain the tank below the lower element port using a garden hose attached to the bottom drain valve. Unscrew the faulty element using a 1-1/2 inch element socket wrench and install an OEM high-density replacement element.
5. **Bleed Air**: Before turning power back on, open hot water faucets until water flows steadily without sputtering air pockets, preventing 'dry firing' of new elements.`,
    opConfirmationNote: "Tested with multimeter and replaced lower element. Daily energy draw dropped by 24 kWh immediately!",
    upvotes: 84,
  },
  {
    title: "How to fix an erratic sleep schedule and chronic afternoon fatigue",
    content: "Over the last 4 months, my sleep schedule drifted completely out of sync. I fall asleep at 2:30 AM, wake up groggy at 9:00 AM, crash hard at 3:00 PM, and end up having 4 cups of coffee just to push through. Has anyone successfully reset their circadian clock without sleeping pills?",
    communityName: "Productivity, Lifestyle & Team Dynamics",
    communityDescription: "Practical frameworks for optimizing deep work, circadian biology, and personal life operations.",
    tags: ["Circadian", "Sleep", "Health", "Productivity"],
    solutionContent: `**The 3-Anchor Circadian Reset Protocol**

Resetting the suprachiasmatic nucleus (the master circadian pacemaker) requires behavioral zeitgebers (time-givers) rather than willpower or sedative sleep aids.

### Reproducible Step-by-Step Protocol:
1. **Hard Anchor Wake Time**: Pick a non-negotiable wake time (e.g., 7:00 AM) and set an alarm across the room. Maintain this exact wake time every single day, including weekends, regardless of when you fell asleep the night before.
2. **Optical Zeitgeber (Lux Exposure)**: Walk outside within 30 minutes of waking for 10-15 minutes without sunglasses. Morning sunlight triggers early cortisol pulse and starts the 14-hour countdown timer for natural melatonin release.
3. **90-Minute Caffeine Delay**: Delay your first cup of coffee or tea by 90 minutes after waking. This allows circulating adenosine to clear naturally, preventing the notorious 2:30 PM crash caused by receptor rebinding.
4. **Afternoon Reset & Cutoff**: Maintain a strict caffeine cutoff at 1:30 PM. At 3:00 PM, substitute coffee with a 10-15 minute Non-Sleep Deep Rest (NSDR) or physiological sigh breathing session.
5. **Evening Lux Reduction**: Dim overhead lights after 8:30 PM and switch screens to night-shift/f.lux mode to prevent blue-light melatonin suppression.`,
    opConfirmationNote: "Applied the 90-minute caffeine delay and fixed 7 AM wake time. Sleep onset is now consistently before 11:30 PM!",
    upvotes: 68,
  },
  {
    title: "How to manage monthly expenses and stop unexpected overdrafts",
    content: "Even with a good income, monthly recurring subscriptions, dining out, and quarterly utility payments constantly cause cash crunches during the final week of every month. I tried tracking receipts in spreadsheets but always abandoned it after 2 weeks. How do you structure a hands-off budget that actually sticks?",
    communityName: "Productivity, Lifestyle & Team Dynamics",
    communityDescription: "Practical frameworks for optimizing deep work, circadian biology, and personal life operations.",
    tags: ["Finance", "Budgeting", "PersonalFinance", "Habits"],
    solutionContent: `**The 3-Account Automated Flow Architecture**

Manual spreadsheet budgeting has a 90% abandonment rate because it relies on active willpower. Instead, automate cashflow separation at the payroll level using a 'Zero-Overdraft Dual-Account Split'.

### Step-by-Step Setup:
1. **Calculate Fixed Overhead**: Review past 90 days of banking records and sum all non-negotiable expenses (rent, mortgage, insurance, utilities, minimum debt service, groceries). Add a 10% safety buffer.
2. **Setup Account Separation**:
   - **Account A (Fixed Obligations)**: Automated bills only. No debit card in your wallet.
   - **Account B (Discretionary Fun Money)**: Daily spending and dining out. Debit card attached.
   - **Account C (High-Yield Savings / Emergency)**: Automated monthly savings transfer.
3. **Automate at Direct Deposit**: In your employer payroll portal, configure multiple direct deposit accounts:
   - Deposit Fixed Overhead + 10% directly into Account A.
   - Deposit Guaranteed Savings into Account C.
   - Deposit remaining balance into Account B for guilt-free daily spending.
4. **Sync Bill Dates**: Contact credit card and utility providers to align billing due dates between the 1st and 5th of each month, eliminating staggered mid-month overdraft surprises.`,
    opConfirmationNote: "Setting up payroll direct deposit across two checking accounts eliminated all end-of-month cash anxiety.",
    upvotes: 92,
  },
  {
    title: "How to resolve an uncomfortable conflict and misunderstanding with a close friend",
    content: "A close friend of mine was upset after I could not attend their weekend celebration due to a last-minute work deadline. They have been giving short, cold one-word answers over text for the past week. I want to repair the friendship without being overly defensive. How do you de-escalate this?",
    communityName: "Productivity, Lifestyle & Team Dynamics",
    communityDescription: "Practical frameworks for optimizing deep work, circadian biology, and personal life operations.",
    tags: ["Communication", "Relationships", "ConflictResolution"],
    solutionContent: `**The Voice-First SBI (Situation-Behavior-Impact) Protocol**

Asynchronous text messaging strips away vocal inflection, micro-expressions, and warmth, converting minor misunderstandings into perceived hostility. De-escalate immediately by transitioning from text to voice.

### Step-by-Step Resolution:
1. **Low-Pressure Bridge Message**: Send a short, sincere text:
   *'Hey, our friendship means the world to me and I feel terrible about missing your celebration last weekend. Do you have 10 minutes for a quick voice call later today? No pressure on time.'*
2. **Apply SBI Framework (Situation - Behavior - Impact)**:
   When on the call, lead with personal accountability without qualifying excuses:
   - **Situation**: *'Last Saturday when I had to cancel for the product outage...'*
   - **Behavior**: *'I notified you last minute over text instead of calling you earlier.'*
   - **Impact**: *'I realize that made you feel like you weren't a priority on a day that mattered a lot to you.'*
3. **Radical Listening (Zero Counter-Arguments)**:
   Do not explain your work stress or explain 'why you were right'. Let them express their disappointment completely before responding.
4. **Follow-Through Repair**:
   Suggest a specific makeup plan that you plan, coordinate, and host (e.g., 'Let me cook dinner or take you out to your favorite spot this Thursday to celebrate properly').`,
    opConfirmationNote: "Used this framework on a phone call yesterday evening. Friction melted away in 10 minutes.",
    upvotes: 57,
  },
  {
    title: "PostgreSQL p99 query latency suddenly spikes from 15ms to 850ms under peak traffic",
    content: "Our core multi-tenant feeds query was running sub-20ms for months. Since crossing 2 million records in the activities table, every day at 12:00 PM EST, query latency spikes past 850ms, causing database connection pool exhaustion and 504 gateway timeouts.",
    communityName: "Full-Stack Web & Database Engineering",
    communityDescription: "Engineering discussions on distributed systems, PostgreSQL query optimization, and Next.js applications.",
    tags: ["PostgreSQL", "Database", "Performance", "Backend"],
    solutionContent: `**Root Cause: Sequential Scan Fallback on Multi-Tenant Composite Filter**

The query was executing \`SELECT * FROM activities WHERE tenant_id = $1 AND is_deleted = false ORDER BY created_at DESC LIMIT 50\`. 

Because only a single-column index on \`tenant_id\` existed, the PostgreSQL query planner abandoned index scans when row counts per tenant exceeded table correlation statistics, falling back to a full table sequential scan and in-memory sort.

### Step-by-Step Fix:
1. **Run Explain Analyze with Buffers**:
   \`\`\`sql
   EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
   SELECT * FROM activities 
   WHERE tenant_id = 'tenant-uuid' AND is_deleted = false 
   ORDER BY created_at DESC LIMIT 50;
   \`\`\`
2. **Create Concurrent Composite Partial Index**:
   Create an index matching the exact query predicate and sorting order:
   \`\`\`sql
   CREATE INDEX CONCURRENTLY idx_activities_tenant_created_active 
   ON activities (tenant_id, created_at DESC) 
   WHERE is_deleted = false;
   \`\`\`
3. **Tune Autovacuum for High-Write Table**:
   Default autovacuum triggers at 20% tuple updates, which is too infrequent for tables with millions of rows:
   \`\`\`sql
   ALTER TABLE activities SET (
     autovacuum_vacuum_scale_factor = 0.05,
     autovacuum_vacuum_cost_limit = 1000
   );
   \`\`\`
4. **Update Planner Statistics**:
   \`\`\`sql
   ANALYZE activities;
   \`\`\`

### Outcome:
Execution plan flipped to **Index Scan using idx_activities_tenant_created_active**. P99 latency dropped from 850ms to 8.2ms under peak 5,000 req/sec load.`,
    opConfirmationNote: "Created the concurrent composite partial index and tuned autovacuum scale factor. P99 latency dropped from 850ms to 8.2ms instantly!",
    upvotes: 112,
  },
  {
    title: "Next.js App Router hydration failed because initial UI does not match server-rendered HTML",
    content: "In our Next.js 15 application, we keep receiving runtime hydration warnings: 'Hydration failed because the initial UI does not match what was rendered on the server.' It occurs intermittently across user profile headers, localized date badges, and dynamic theme icons.",
    communityName: "Full-Stack Web & Database Engineering",
    communityDescription: "Engineering discussions on distributed systems, PostgreSQL query optimization, and Next.js applications.",
    tags: ["NextJS", "React", "SSR", "Frontend"],
    solutionContent: `**Root Cause & Architecture Fix: Client-Only State Inconsistencies During Hydration**

React SSR hydration requires the initial DOM tree generated by the server to match the client's initial HTML output byte-for-byte. Hydration mismatches occur when components access client-only browser APIs during initial render:
- \`new Date().toLocaleTimeString()\` or timezone formatting.
- \`window.innerWidth\` / media queries.
- \`localStorage\` or cookie-based state accessed before component mount.

### Step-by-Step Fix:

1. **Use an IsMounted Hook or Two-Pass Render for Dynamic Browser State**:
   \`\`\`tsx
   import { useState, useEffect } from 'react';

   export function useIsMounted() {
     const [mounted, setMounted] = useState(false);
     useEffect(() => {
       setMounted(true);
     }, []);
     return mounted;
   }
   \`\`\`
   In your component:
   \`\`\`tsx
   export function UserHeader({ user }) {
     const isMounted = useIsMounted();
     
     return (
       <div>
         <h2>{user.name}</h2>
         {isMounted ? (
           <span>Local Time: {new Date().toLocaleTimeString()}</span>
         ) : (
           <span className="opacity-0">00:00:00 AM</span>
         )}
       </div>
     );
   }
   \`\`\`

2. **Suppress Expected Non-Critical Discrepancies**:
   For timestamps that unavoidably differ due to real-time clock drift between server and client:
   \`\`\`tsx
   <time dateTime={date.toISOString()} suppressHydrationWarning>
     {formatDate(date)}
   </time>
   \`\`\`

3. **Dynamic Imports with SSR Disabled for Pure Browser Widgets**:
   \`\`\`tsx
   import dynamic from 'next/dynamic';

   const ClientMapWidget = dynamic(() => import('./MapWidget'), {
     ssr: false,
     loading: () => <div className="h-64 bg-zinc-900 animate-pulse rounded-xl" />
   });
   \`\`\``,
    opConfirmationNote: "Applied the two-pass mount check and dynamic imports for browser widgets. Hydration warnings are 100% resolved!",
    upvotes: 96,
  },
];

async function main() {
  console.log("🌱 Migrating 6 Real-World Problem-and-Solution threads into PostgreSQL...");

  // 1. Get the admin user
  const admin = await prisma.users.findUnique({
    where: { email: "admin@community.com" },
  });

  if (!admin) {
    throw new Error("Admin user (admin@community.com) not found! Run prisma/seed_one_admin.ts first.");
  }
  const adminId = admin.id;

  // Cache for communities
  const communityCache = new Map<string, string>();

  // Helper to ensure community exists
  async function getOrCreateCommunity(name: string, description: string): Promise<string> {
    if (communityCache.has(name)) {
      return communityCache.get(name)!;
    }

    let community = await prisma.communities.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });

    if (!community) {
      community = await prisma.communities.create({
        data: {
          name,
          description,
          owner_id: adminId,
          is_visible_public: "public",
          anyone_can_join: true,
          updated_at: new Date(),
          banner_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
          logo_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=200&q=80",
        },
      });
      console.log(`✓ Created community: "${name}"`);
    }

    communityCache.set(name, community.id);
    return community.id;
  }

  // 2. Iterate each scenario and seed into PostgreSQL
  let createdCount = 0;
  let updatedCount = 0;

  for (const s of SCENARIOS) {
    const communityId = await getOrCreateCommunity(s.communityName, s.communityDescription);

    // Check if discussion with this title exists
    let discussion = await prisma.discussions.findFirst({
      where: { title: s.title },
    });

    if (!discussion) {
      discussion = await prisma.discussions.create({
        data: {
          title: s.title,
          content: s.content,
          community_id: communityId,
          author_id: adminId,
          is_pinned: false,
          is_locked: false,
        },
      });
      createdCount++;
      console.log(`\n✓ Created Discussion: "${s.title}" (ID: ${discussion.id})`);
    } else {
      updatedCount++;
      console.log(`\n• Discussion already exists: "${s.title}" (ID: ${discussion.id})`);
    }

    // 3. Upsert Tags and attach to Discussion
    for (const tagName of s.tags) {
      let tag = await prisma.tagsMaster.findUnique({
        where: { name: tagName },
      });
      if (!tag) {
        tag = await prisma.tagsMaster.create({
          data: {
            name: tagName,
            description: `${tagName} topics and discussions`,
            is_active: true,
            updated_at: new Date(),
          },
        });
      }

      await prisma.discussionTags.upsert({
        where: {
          discussionId_tagId: {
            discussionId: discussion.id,
            tagId: tag.id,
          },
        },
        create: {
          discussionId: discussion.id,
          tagId: tag.id,
        },
        update: {},
      });
    }

    // 4. Ensure verified solution reply exists
    const existingSolution = await prisma.discussionReply.findFirst({
      where: {
        discussionId: discussion.id,
        is_solution: true,
      },
    });

    if (!existingSolution) {
      const solutionReply = await prisma.discussionReply.create({
        data: {
          discussionId: discussion.id,
          authorId: adminId,
          content: s.solutionContent,
          is_solution: true,
          is_op_confirmed: true,
          op_confirmed_at: new Date(),
          op_confirmation_note: s.opConfirmationNote,
          upvotes: s.upvotes,
        },
      });
      console.log(`  ✓ Added Verified Solution reply (ID: ${solutionReply.id}, Upvotes: ${s.upvotes})`);
    } else {
      await prisma.discussionReply.update({
        where: { id: existingSolution.id },
        data: {
          content: s.solutionContent,
          is_solution: true,
          is_op_confirmed: true,
          op_confirmation_note: s.opConfirmationNote,
          upvotes: s.upvotes,
        },
      });
      console.log(`  • Updated existing verified solution reply (ID: ${existingSolution.id})`);
    }

    // 5. Generate and persist semantic vector embeddings
    try {
      const embedded = await saveDiscussionEmbedding(
        discussion.id,
        s.title,
        s.content,
        s.tags
      );
      if (embedded) {
        console.log(`  ✓ Generated & saved semantic embeddings for vector search`);
      }
    } catch (e: any) {
      console.warn(`  ! Could not generate embedding: ${e.message}`);
    }
  }

  console.log(`\n============================================================`);
  console.log(`  MIGRATION COMPLETE: ${createdCount} created, ${updatedCount} updated.`);
  console.log(`  ALL 6 SCENARIOS ARE NOW PERMANENT POSTGRESQL DATABASE RECORDS.`);
  console.log(`============================================================\n`);
}

main()
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
