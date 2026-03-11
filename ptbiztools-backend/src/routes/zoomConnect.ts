import { Router } from 'express';
import { prisma } from '../services/prisma';

const router = Router();

// POST /api/zoom/connect - Store Zoom OAuth credentials
router.post('/connect', async (req, res) => {
  try {
    const {
      zoomUserId,
      email,
      firstName,
      lastName,
      accessToken,
      refreshToken,
      expiresIn,
      scope,
      connectedAt,
    } = req.body;

    // Validate required fields
    if (!zoomUserId || !accessToken || !refreshToken) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'zoomUserId, accessToken, and refreshToken are required',
      });
    }

    // Get the current user from the request (assuming auth middleware sets req.user)
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'User must be authenticated to connect Zoom',
      });
    }

    // Calculate token expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (expiresIn || 3600));

    // Upsert Zoom connection for the user
    const zoomConnection = await prisma.zoomConnection.upsert({
      where: {
        userId,
      },
      update: {
        zoomUserId,
        email,
        firstName,
        lastName,
        accessToken,
        refreshToken,
        expiresAt,
        scope,
        connectedAt: new Date(connectedAt),
        status: 'active',
      },
      create: {
        userId,
        zoomUserId,
        email,
        firstName,
        lastName,
        accessToken,
        refreshToken,
        expiresAt,
        scope,
        connectedAt: new Date(connectedAt),
        status: 'active',
      },
    });

    // Log the connection
    console.log(`Zoom connected for user ${userId}:`, {
      zoomUserId,
      email,
      connectedAt,
    });

    return res.status(200).json({
      success: true,
      message: 'Zoom account connected successfully',
      data: {
        id: zoomConnection.id,
        zoomUserId: zoomConnection.zoomUserId,
        email: zoomConnection.email,
        connectedAt: zoomConnection.connectedAt,
        status: zoomConnection.status,
      },
    });

  } catch (error) {
    console.error('Error storing Zoom credentials:', error);
    return res.status(500).json({
      error: 'Failed to store Zoom credentials',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/zoom/status - Check Zoom connection status
router.get('/status', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const connection = await prisma.zoomConnection.findUnique({
      where: { userId },
    });

    if (!connection) {
      return res.status(200).json({
        connected: false,
        message: 'No Zoom account connected',
      });
    }

    // Check if token is expired
    const isExpired = new Date() > connection.expiresAt;
    
    return res.status(200).json({
      connected: true,
      status: connection.status,
      email: connection.email,
      connectedAt: connection.connectedAt,
      isExpired,
      scopes: connection.scope?.split(' ') || [],
    });

  } catch (error) {
    console.error('Error checking Zoom status:', error);
    return res.status(500).json({
      error: 'Failed to check Zoom status',
    });
  }
});

// POST /api/zoom/disconnect - Disconnect Zoom account
router.post('/disconnect', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await prisma.zoomConnection.delete({
      where: { userId },
    });

    return res.status(200).json({
      success: true,
      message: 'Zoom account disconnected successfully',
    });

  } catch (error) {
    console.error('Error disconnecting Zoom:', error);
    return res.status(500).json({
      error: 'Failed to disconnect Zoom account',
    });
  }
});

export default router;
