export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Collaborative Team Hub API",
    version: "1.0.0",
    description:
      "REST API for the FredoCloud Collaborative Team Hub technical assessment. Includes authentication, workspaces, goals, milestones, announcements, action items, analytics, notifications, and audit logs."
  },
  servers: [
    {
      url: "http://localhost:5000",
      description: "Local API"
    },
    {
      url: "https://api-production-e292.up.railway.app",
      description: "Production API"
    }
  ],
  tags: [
    { name: "Health" },
    { name: "Auth" },
    { name: "Workspaces" },
    { name: "Goals" },
    { name: "Announcements" },
    { name: "Action Items" },
    { name: "Notifications" },
    { name: "Analytics" },
    { name: "Audit Logs" }
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "accessToken"
      }
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          message: {
            type: "string",
            example: "Unauthorized"
          }
        }
      },
      RegisterInput: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", example: "Demo User" },
          email: { type: "string", example: "demo@fredocloud.app" },
          password: { type: "string", example: "Demo@123456" }
        }
      },
      LoginInput: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", example: "demo@fredocloud.app" },
          password: { type: "string", example: "Demo@123456" }
        }
      },
      WorkspaceInput: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", example: "FredoCloud Demo Workspace" },
          description: {
            type: "string",
            example: "Workspace for managing goals and action items"
          },
          accentColor: { type: "string", example: "#0f172a" }
        }
      },
      GoalInput: {
        type: "object",
        required: ["teamId", "title"],
        properties: {
          teamId: { type: "string" },
          title: { type: "string", example: "Launch workspace MVP" },
          description: { type: "string", example: "Complete core features" },
          ownerId: { type: "string" },
          dueDate: { type: "string", example: "2026-05-10" },
          status: {
            type: "string",
            enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"]
          }
        }
      },
      ActionItemInput: {
        type: "object",
        required: ["teamId", "title"],
        properties: {
          teamId: { type: "string" },
          title: { type: "string", example: "Record walkthrough video" },
          description: { type: "string" },
          assigneeId: { type: "string" },
          goalId: { type: "string" },
          priority: {
            type: "string",
            enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
            example: "HIGH"
          },
          dueDate: { type: "string", example: "2026-05-03" }
        }
      }
    }
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Check API health",
        responses: {
          200: {
            description: "API is running"
          }
        }
      }
    },

    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RegisterInput"
              }
            }
          }
        },
        responses: {
          201: { description: "User registered successfully" },
          400: { description: "Validation error" }
        }
      }
    },

    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/LoginInput"
              }
            }
          }
        },
        responses: {
          200: { description: "Login successful" },
          401: { description: "Invalid credentials" }
        }
      }
    },

    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current authenticated user",
        security: [{ cookieAuth: [] }],
        responses: {
          200: { description: "Current user returned" },
          401: { description: "Unauthorized" }
        }
      }
    },

    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout user",
        security: [{ cookieAuth: [] }],
        responses: {
          200: { description: "Logout successful" }
        }
      }
    },

    "/api/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh access token",
        responses: {
          200: { description: "Token refreshed" },
          401: { description: "Invalid refresh token" }
        }
      }
    },

    "/api/auth/avatar": {
      patch: {
        tags: ["Auth"],
        summary: "Upload user avatar",
        security: [{ cookieAuth: [] }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  avatar: {
                    type: "string",
                    format: "binary"
                  }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Avatar uploaded successfully" }
        }
      }
    },

    "/api/teams": {
      get: {
        tags: ["Workspaces"],
        summary: "Get current user's workspaces",
        security: [{ cookieAuth: [] }],
        responses: {
          200: { description: "Workspace list returned" }
        }
      },
      post: {
        tags: ["Workspaces"],
        summary: "Create workspace",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/WorkspaceInput"
              }
            }
          }
        },
        responses: {
          201: { description: "Workspace created" }
        }
      }
    },

    "/api/teams/{teamId}": {
      get: {
        tags: ["Workspaces"],
        summary: "Get workspace details",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "teamId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          200: { description: "Workspace returned" },
          403: { description: "Not a workspace member" }
        }
      },
      patch: {
        tags: ["Workspaces"],
        summary: "Update workspace settings",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "teamId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          200: { description: "Workspace updated" }
        }
      }
    },

    "/api/teams/{teamId}/invite": {
      post: {
        tags: ["Workspaces"],
        summary: "Invite member by email",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "teamId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", example: "member@example.com" },
                  role: {
                    type: "string",
                    enum: ["ADMIN", "MEMBER"],
                    example: "MEMBER"
                  }
                }
              }
            }
          }
        },
        responses: {
          201: { description: "Member invited" }
        }
      }
    },

    "/api/goals": {
      post: {
        tags: ["Goals"],
        summary: "Create goal",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/GoalInput"
              }
            }
          }
        },
        responses: {
          201: { description: "Goal created" }
        }
      }
    },

    "/api/goals/team/{teamId}": {
      get: {
        tags: ["Goals"],
        summary: "Get workspace goals",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "teamId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          200: { description: "Goals returned" }
        }
      }
    },

    "/api/goals/{goalId}/milestones": {
      post: {
        tags: ["Goals"],
        summary: "Create milestone under goal",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "goalId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          201: { description: "Milestone created" }
        }
      }
    },

    "/api/goals/{goalId}/updates": {
      post: {
        tags: ["Goals"],
        summary: "Post goal progress update",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "goalId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          201: { description: "Progress update created" }
        }
      }
    },

    "/api/announcements": {
      post: {
        tags: ["Announcements"],
        summary: "Create announcement with optional attachment",
        security: [{ cookieAuth: [] }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["teamId", "title", "content"],
                properties: {
                  teamId: { type: "string" },
                  title: { type: "string" },
                  content: { type: "string" },
                  isPinned: { type: "boolean" },
                  attachment: {
                    type: "string",
                    format: "binary"
                  }
                }
              }
            }
          }
        },
        responses: {
          201: { description: "Announcement created" }
        }
      }
    },

    "/api/announcements/{announcementId}/comments": {
      post: {
        tags: ["Announcements"],
        summary: "Comment on announcement and trigger @mention notifications",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "announcementId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          201: { description: "Comment created" }
        }
      }
    },

    "/api/announcements/{announcementId}/reactions": {
      post: {
        tags: ["Announcements"],
        summary: "Toggle emoji reaction",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "announcementId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          201: { description: "Reaction added" },
          200: { description: "Reaction removed" }
        }
      }
    },

    "/api/action-items": {
      post: {
        tags: ["Action Items"],
        summary: "Create action item",
        security: [{ cookieAuth: [] }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                allOf: [
                  {
                    $ref: "#/components/schemas/ActionItemInput"
                  },
                  {
                    type: "object",
                    properties: {
                      attachment: {
                        type: "string",
                        format: "binary"
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        responses: {
          201: { description: "Action item created" }
        }
      }
    },

    "/api/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "Get current user's notifications",
        security: [{ cookieAuth: [] }],
        responses: {
          200: { description: "Notifications returned" }
        }
      }
    },

    "/api/analytics/{teamId}": {
      get: {
        tags: ["Analytics"],
        summary: "Get workspace analytics",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "teamId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          200: { description: "Analytics returned" }
        }
      }
    },

    "/api/analytics/{teamId}/export.csv": {
      get: {
        tags: ["Analytics"],
        summary: "Export workspace data as CSV",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "teamId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          200: {
            description: "CSV export"
          }
        }
      }
    },

    "/api/audit-logs/{teamId}": {
      get: {
        tags: ["Audit Logs"],
        summary: "Get workspace audit logs",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "teamId",
            in: "path",
            required: true,
            schema: { type: "string" }
          },
          {
            name: "action",
            in: "query",
            required: false,
            schema: { type: "string" }
          },
          {
            name: "entity",
            in: "query",
            required: false,
            schema: { type: "string" }
          }
        ],
        responses: {
          200: { description: "Audit logs returned" }
        }
      }
    },

    "/api/audit-logs/{teamId}/export.csv": {
      get: {
        tags: ["Audit Logs"],
        summary: "Export audit logs as CSV",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "teamId",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          200: { description: "Audit CSV export" }
        }
      }
    }
  }
};