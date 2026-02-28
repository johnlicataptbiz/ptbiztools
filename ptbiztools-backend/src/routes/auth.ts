import express from 'express';
import bcrypt from 'bcryptjs';
import type { CookieOptions } from 'express';
import { prisma } from '../services/prisma.js';

const router = express.Router();
const isProd = process.env.NODE_ENV === 'production';
let teamProfilesSynchronized = false;
let teamProfileSyncPromise: Promise<void> | null = null;

function getCookieOptions(maxAge?: number): CookieOptions {
  return {
    httpOnly: true,
    maxAge,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
  };
}

function getRoleForMember(member: { teamSection?: string | null; title?: string | null; name: string }) {
  const section = member.teamSection || '';
  const title = member.title?.toLowerCase() || '';

  if (
    section === 'Partners' ||
    section === 'Acquisitions' ||
    section === 'Client Success' ||
    title.includes('ceo') ||
    title.includes('cfo')
  ) {
    return 'admin';
  }

  if (
    section === 'Advisors' ||
    section === 'Board' ||
    title.includes('advisor')
  ) {
    return 'advisor';
  }

  return 'coach';
}

async function ensureTeamMembersSeeded() {
  if (teamProfilesSynchronized) return;

  if (!teamProfileSyncPromise) {
    teamProfileSyncPromise = (async () => {
      for (const member of TEAM_MEMBERS) {
        await upsertTeamMember(member);
      }
      teamProfilesSynchronized = true;
    })()
      .finally(() => {
        teamProfileSyncPromise = null;
      });
  }

  await teamProfileSyncPromise;
}

async function upsertTeamMember(member: (typeof TEAM_MEMBERS)[number]) {
  const data = { ...member, role: getRoleForMember(member) };
  const existing = await prisma.user.findFirst({ where: { name: member.name } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data,
    });
    return;
  }

  await prisma.user.create({ data });
}

function getClientIp(req: express.Request) {
  const forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded) && forwarded.length > 0) return forwarded[0];
  if (typeof forwarded === 'string' && forwarded.length > 0) return forwarded.split(',')[0].trim();
  return req.ip || null;
}

async function recordLoginEvent(input: {
  req: express.Request;
  userId?: string | null;
  rememberMe?: boolean | null;
  sessionId?: string | null;
  success: boolean;
}) {
  try {
    await prisma.loginEvent.create({
      data: {
        userId: input.userId || null,
        success: input.success,
        rememberMe: input.rememberMe ?? null,
        sessionId: input.sessionId || null,
        ipAddress: getClientIp(input.req),
        userAgent: input.req.headers['user-agent'] || null,
      },
    });
  } catch (error) {
    console.error('Failed to record login event:', error);
  }
}

const TEAM_MEMBERS = [
  // Partners
  { name: 'Danny Matta', title: 'CEO', teamSection: 'Partners', bio: 'Physical therapist, entrepreneur, and educator. After spending years in the Army as a Physical Therapist, he left service in 2014 to teach for Kelly Starrett\'s Ready State group. He started Athletes\' Potential cash-based practice and scaled it to the largest in Georgia.', imageUrl: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2149643710/settings_images/d55614-bc52-48d5-88d3-e5e22a4b82d5_2.png' },
  { name: 'Yves Gege', title: 'Head of Customer Success and Coaching', teamSection: 'Partners', bio: 'Former in-network PT clinic owner turned cash PT entrepreneur. Founder of Made 2 Move Physical Therapy in Charleston, SC.', imageUrl: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2149643710/settings_images/af522d-f64d-7cdf-d7c7-e17268dba1fd_3.png' },
  { name: 'Jerred Moon', title: 'CFO', teamSection: 'Partners', bio: 'Coach, author, and veteran that served as Captain in the U.S. Air Force. Founded digital businesses since 2014 with 8-figures revenue.', imageUrl: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2149643710/settings_images/b05f85-5302-f230-a0cc-366c610bfb5d_1.png' },
  // Coaches
  { name: 'Courtney Morse', title: 'Head Coach', teamSection: 'Coaches', bio: 'Owner of Natural Wellness Physiotherapy in Wichita, KS. Cash-based clinic founded in 2017.', imageUrl: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2149643710/settings_images/b2b5f74-687a-ecf-1e1-23ee7a3d6fe0_8.png' },
  { name: 'Brooke Miller', title: 'Coach', teamSection: 'Coaches', bio: 'Owner of PeakRx Therapy in Dallas, TX. Pelvic health and performance PT.', imageUrl: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2149643710/settings_images/66f623-ee1e-c1d2-d42e-e8eba6158802_6.png' },
  { name: 'Elizabeth Rudd', title: 'Coach', teamSection: 'Coaches', bio: 'Founder of Well Equipt in Atlanta, GA. Sports performance, rehab, and pain management.', imageUrl: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2149643710/settings_images/8a3b30d-1387-aa7d-2c7a-f60ee487cdc_10.png' },
  { name: 'Daniel Laughlin', title: 'Coach', teamSection: 'Coaches', bio: 'Started traditional insurance practice in 2012, converted to hybrid practice in 2019.', imageUrl: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2149643710/settings_images/00e1aa-cdfb-ed5d-c24-b316b47d4a8_4.png' },
  { name: 'Jaxie Meth', title: 'Coach', teamSection: 'Coaches', bio: 'Owner of The METHOD Performance and Physical Therapy in Boston, MA.', imageUrl: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2149643710/settings_images/dd2afcb-c5f1-a57-7d33-3e63d357037_11.png' },
  { name: 'DJ Haskins', title: 'Coach', teamSection: 'Coaches', bio: 'Founder of Bliss Pelvic Health in Tampa Bay, FL.', imageUrl: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2149643710/settings_images/5dd06ae-4a6-042d-0a2-08cbb40d3057_24.png' },
  { name: 'Ashley Speights', title: 'Coach', teamSection: 'Coaches', bio: 'Founder of The PHYT Collective in downtown DC.', imageUrl: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2149643710/settings_images/2aa38e2-b8f6-a583-6c83-63c102fd08_26.png' },
  { name: 'Chris Robl', title: 'Coach', teamSection: 'Coaches', bio: 'Founder of Physio Room. 10+ years experience in PT.', imageUrl: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2149643710/settings_images/4d2876e-dcc8-d35a-a23-3ed6f6da66_13.png' },
  { name: 'Ziad Dahdul', title: 'Coach', teamSection: 'Coaches', bio: '11+ years experience with athletes. DPT from USC.', imageUrl: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2149643710/settings_images/f34a141-cd4f-e0ae-0b7-56258dbcb42_27.png' },
  { name: 'Michael Sclafani', title: 'Coach', teamSection: 'Coaches', bio: 'Owner of Tideline Sports Performance & Rehabilitation in Sarasota, FL.', imageUrl: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2149643710/settings_images/cf4b5bf-4f24-c5c-b4a7-acc04a1e13e_29.png' },
  { name: 'Colleen Davis', title: 'Coach', teamSection: 'Coaches', bio: 'Founder of GOAT Physical Therapy and Wellness in Gales Ferry, CT.', imageUrl: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2149643710/settings_images/e52ce3-6c46-4ace-0b38-8ad58c602ffe_31.png' },
  { name: 'Tyler Humphries', title: 'Coach', teamSection: 'Coaches', bio: 'Founder of Bulletproof Physical Therapy in Houston, Texas.', imageUrl: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2149643710/settings_images/f70088-c07f-7ad8-d8e6-2e8a1f00244_TEAM.png' },
  // Advisors
  { name: 'John Licata', title: 'Senior Advisor', teamSection: 'Advisors', bio: '30+ years in consumer goods industry. Executive positions with multi-billion dollar corporations.', imageUrl: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2149643710/settings_images/ebcc12b-774a-dba-5bb0-1ce3505de0_18.png' },
  { name: 'Toni Counts', title: 'Business Advisor', teamSection: 'Advisors', bio: 'Founded Off The Block Performance Physical Therapy of SC in 2021.', imageUrl: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2149643710/settings_images/685c8e0-a8c2-c35-d7-e854fc58bdc_23.png' },
  // Client Success
  { name: 'Brandon Erwin', title: 'Client Success', teamSection: 'Client Success', bio: 'Managing the P.T. Entrepreneur Podcast since 2019.', imageUrl: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2149643710/settings_images/6f485-7c2-a2aa-fe22-6bc3585bbd3f_16.png' },
  { name: 'Amy Gege', title: 'Client Success', teamSection: 'Client Success', bio: '20+ years experience in Event Planning industry.', imageUrl: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2149643710/settings_images/713e3-a2b3-0501-682-02fc421ab8_15.png' },
  { name: 'Ashley Matta', title: 'First Lady of PT Biz', teamSection: 'Client Success', bio: 'Co-founded Athletes\' Potential with Danny. Business owner with extraordinary organizational skills.', imageUrl: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2149643710/settings_images/605ae52-c41b-724-e154-837f6dc710_21.png' },
  { name: 'Nicole Miller', title: 'Acquisitions', teamSection: 'Client Success', bio: 'DPT from West Virginia University. Works in acquisitions and website building.', imageUrl: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2149643710/settings_images/6884470-4ee-1f61-ed4d-510083a700f6_30.png' },
  { name: 'Bekah Fay', title: 'Acquisitions', teamSection: 'Client Success', bio: 'DPT from University of Miami. Owner of CrossFit affiliate with cash-based PT practice.', imageUrl: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2149643710/settings_images/427611d-43d6-7130-84fe-4542a142f15_TEAM_4_.png' },
  // Acquisitions
  { name: 'Kaitlin Wilcox', title: 'Acquisitions', teamSection: 'Acquisitions', bio: 'Registered Nurse and Cardiac Rehab Exercise Physiologist.', imageUrl: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2149643710/settings_images/782f1f8-2d5-efda-aad6-e42e5c1151_9.png' },
  { name: 'Trampis Beatty', title: 'Acquisitions', teamSection: 'Acquisitions', bio: '10+ years in construction industry. Heads up website building for PTBiz Rainmakers.', imageUrl: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2149643710/settings_images/042bea3-d84-a2de-800-b56a21642e0d_20.png' },
  { name: 'Justin Pfluger', title: 'Acquisitions', teamSection: 'Acquisitions', bio: '7 years in Ecommerce. Expert in Facebook, Instagram, and Google advertising.', imageUrl: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2149643710/settings_images/0a48dd-3ca-b135-717f-8684c3e15eed_32.png' },
  { name: 'E\'an Verdugo', title: 'Creative Director', teamSection: 'Acquisitions', bio: 'Videographer and storyteller. Joined PT BIZ full-time as Creative Director.', imageUrl: 'https://ca.slack-edge.com/TJ3QQ76KV-U08BHJHRBGB-4aa11c3a6e1a-512' },
  // Advisors - Board
  { name: 'Dr. Kelly Starrett', title: 'Board Advisor', teamSection: 'Board', bio: 'Co-author of New York Times bestsellers. Co-founder of San Francisco CrossFit.', imageUrl: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2149643710/settings_images/7efab1-a588-a364-6420-ed62a74a3af2_s9SGS8jtQv2ZXpUAaUvK_Headshot_outdoor_Kelly_2827.jpg' },
  { name: 'Juliet Starrett', title: 'Board Advisor', teamSection: 'Board', bio: 'Co-Founder and CEO of The Ready State. Former professional whitewater paddler.', imageUrl: 'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/file-uploads/themes/2149643710/settings_images/ec2cb61-4ac4-533-1683-5e6dc6cb2b3_NACi1RdNQBihM8PWYYqc_juliet-square.webp' },
];

// Seed team members
router.post('/seed', async (req, res) => {
  try {
    for (const member of TEAM_MEMBERS) {
      await upsertTeamMember(member);
    }
    res.json({ message: 'Team members seeded successfully', count: TEAM_MEMBERS.length });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: 'Failed to seed team members' });
  }
});

// Get all team members (for login selection)
router.get('/team', async (req, res) => {
  try {
    await ensureTeamMembersSeeded();

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        title: true,
        teamSection: true,
        imageUrl: true,
        role: true,
        passwordHash: true,
      },
      orderBy: [
        { teamSection: 'asc' },
        { name: 'asc' },
      ],
    });
    res.json(users.map((user) => ({
      id: user.id,
      name: user.name,
      title: user.title,
      teamSection: user.teamSection,
      imageUrl: user.imageUrl,
      role: user.role,
      hasPassword: Boolean(user.passwordHash),
    })));
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Failed to get team' });
  }
});

// Setup password (first time or reset)
router.post('/setup-password', async (req, res) => {
  try {
    await ensureTeamMembersSeeded();

    const { userId, password } = req.body;
    if (!userId || !password) {
      return res.status(400).json({ error: 'User ID and password required' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    res.json({ 
      message: 'Password set successfully',
      user: {
        id: user?.id,
        name: user?.name,
        title: user?.title,
        teamSection: user?.teamSection,
        imageUrl: user?.imageUrl,
        role: user?.role,
      }
    });
  } catch (error) {
    console.error('Setup password error:', error);
    res.status(500).json({ error: 'Failed to set password' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    await ensureTeamMembersSeeded();

    const { userId, password, rememberMe, sessionId } = req.body;
    if (!userId || !password) {
      await recordLoginEvent({ req, userId: userId || null, rememberMe: rememberMe ?? null, sessionId: sessionId || null, success: false });
      return res.status(400).json({ error: 'User ID and password required' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      await recordLoginEvent({ req, userId: null, rememberMe: rememberMe ?? null, sessionId: sessionId || null, success: false });
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.passwordHash) {
      await recordLoginEvent({ req, userId: user.id, rememberMe: rememberMe ?? null, sessionId: sessionId || null, success: false });
      return res.status(401).json({ error: 'Password not set', needsSetup: true });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      await recordLoginEvent({ req, userId: user.id, rememberMe: rememberMe ?? null, sessionId: sessionId || null, success: false });
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Set cookie
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 30 days or 1 day
    res.cookie('ptbiz_user', user.id, getCookieOptions(maxAge));

    await recordLoginEvent({ req, userId: user.id, rememberMe: rememberMe ?? null, sessionId: sessionId || null, success: true });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        title: user.title,
        teamSection: user.teamSection,
        imageUrl: user.imageUrl,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('ptbiz_user', getCookieOptions());
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    await ensureTeamMembersSeeded();

    const userId = req.cookies?.ptbiz_user;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        title: user.title,
        teamSection: user.teamSection,
        imageUrl: user.imageUrl,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
