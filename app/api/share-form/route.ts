import { NextResponse } from "next/server";

// Example using NodeMailer or any other email service
// For now, this just logs to console

export async function POST(req: Request) {
  try {
    const { emails, link } = await req.json();

    if (!emails || !link) {
      return NextResponse.json({ error: "Missing emails or link" }, { status: 400 });
    }

    // TODO: Integrate email service here
    console.log(`Sending form link: ${link} to emails: ${emails.join(", ")}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to share form" }, { status: 500 });
  }
}
