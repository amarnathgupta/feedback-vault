import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction(async (tx) => {
    // 1. Create 3 Users (using upsert)
    const [user1, user2, user3] = await Promise.all([
      tx.user.upsert({
        where: { email: "rahul@example.com" },
        update: {},
        create: {
          email: "rahul@example.com",
          name: "Rahul",
          password: "hashedpass1",
        },
      }),
      tx.user.upsert({
        where: { email: "priya@example.com" },
        update: {},
        create: {
          email: "priya@example.com",
          name: "Priya",
          password: "hashedpass2",
        },
      }),
      tx.user.upsert({
        where: { email: "amit@example.com" },
        update: {},
        create: {
          email: "amit@example.com",
          name: "Amit",
          password: "hashedpass3",
          role: "ADMIN",
        },
      }),
    ]);

    // 2. Create Page (upsert by slug)
    const page = await tx.page.upsert({
      where: { slug: "rahul-feedback" },
      update: {},
      create: {
        slug: "rahul-feedback",
        title: "Feedback Page for Rahul",
        description: "Drop your thoughts here",
      },
    });

    // 3. Page Members (use upsert for each)
    await Promise.all([
      tx.pageMember.upsert({
        where: {
          pageId_userId: { pageId: page.id, userId: user1.id },
        },
        update: {},
        create: {
          pageId: page.id,
          userId: user1.id,
          role: "OWNER",
        },
      }),
      tx.pageMember.upsert({
        where: {
          pageId_userId: { pageId: page.id, userId: user2.id },
        },
        update: {},
        create: {
          pageId: page.id,
          userId: user2.id,
          role: "MODERATOR",
        },
      }),
    ]);

    // 4. Top-level comment by user1 (can use findFirst or upsert logic if needed)
    const topComment = await tx.comment.upsert({
      where: {
        // Needs a unique constraint — assuming (pageId, userId, message) is unique for seed
        id: "top-comment1", // or generate deterministic UUID if needed
      },
      update: {},
      create: {
        id: "top-comment1",
        pageId: page.id,
        userId: user1.id,
        message: "This is a top-level comment",
        isAnonymous: false,
      },
    });
    await tx.comment.upsert({
      where: {
        // Needs a unique constraint — assuming (pageId, userId, message) is unique for seed
        id: "top-comment2", // or generate deterministic UUID if needed
      },
      update: {},
      create: {
        id: "top-comment2",
        pageId: page.id,
        userId: user1.id,
        message: "This is a top-level 2nd level comment",
        isAnonymous: true,
      },
    });

    // 5. Reply to that comment
    const replyComment = await tx.comment.upsert({
      where: {
        id: "reply-comment",
      },
      update: {},
      create: {
        id: "reply-comment",
        pageId: page.id,
        userId: user2.id,
        parentId: topComment.id,
        message: "This is a reply",
        isAnonymous: false,
      },
    });

    // 6. Reaction on top comment by user3
    await tx.reaction.upsert({
      where: {
        // You might want to add a unique constraint like (commentId, userId)
        id: "reaction-top", // Replace with deterministic ID if needed
      },
      update: {},
      create: {
        id: "reaction-top",
        commentId: topComment.id,
        userId: user3.id,
        emoji: "👍",
      },
    });

    // 7. Report the reply by user2 (reported by user1)
    await tx.report.upsert({
      where: {
        id: "report-reply",
      },
      update: {},
      create: {
        id: "report-reply",
        commentId: replyComment.id,
        pageId: page.id,
        reportedById: user1.id,
        reason: "SPAM",
      },
    });
  });
}

main()
  .then(() => {
    console.log("🌱 DB seeded safely with upserts and transaction!");
  })
  .catch((e) => {
    console.error("❌ Seed failed:", e);
  })
  .finally(() => prisma.$disconnect());
