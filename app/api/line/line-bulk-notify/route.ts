import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { itemsCount, updatedFields, itemTitles } = await req.json();

    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const groupId = process.env.NEXT_PUBLIC_LINE_GROUP_ID;

    if (!token || !groupId) {
      return NextResponse.json({ error: 'LINE token or group ID is missing' }, { status: 500 });
    }

    const fieldLabels: Record<string, string> = {
      status: 'ステータス',
      editor: '編集担当',
      director: 'ディレクター',
      internalDeadline: '内部期日',
      firstDraftDate: '初稿提出日',
      clientDeadline: '先方提出日',
    };

    const changesText = Object.entries(updatedFields)
      .map(([key, val]) => `・${fieldLabels[key] || key}: ${val}`)
      .join('\n');

    const titlePreview = itemTitles.slice(0, 5).map((t: string) => ` - ${t}`).join('\n');
    const remainingText = itemTitles.length > 5 ? `\n (他 ${itemTitles.length - 5} 件)` : '';

    const message = `📢 【案件一括更新通知】\n${itemsCount} 件の案件がまとめて更新されました。\n\n【更新内容】\n${changesText}\n\n【対象案件】\n${titlePreview}${remainingText}`;

    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: groupId,
        messages: [{ type: 'text', text: message }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}