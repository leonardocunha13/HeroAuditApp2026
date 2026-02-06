// app/api/send-email/route.ts
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({
  region: "ap-southeast-2", // your SES region
});

export async function POST(req: Request) {
    console.log("Amplify SES Client running. Process.env:", {
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
});

  try {
    const { toEmails, subject, body } = await req.json();

    if (!toEmails || !subject || !body) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
    }

    const command = new SendEmailCommand({
      Destination: {
        ToAddresses: toEmails, // array of email addresses
      },
      Message: {
        Body: {
          Html: { Data: body }, // you can also use Text: { Data: "plain text" }
        },
        Subject: { Data: subject },
      },
      Source: "leonardo.dejesus@heroengineering.com.au", // verified SES email
    });

    await sesClient.send(command);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Failed to send email" }), { status: 500 });
  }
}
