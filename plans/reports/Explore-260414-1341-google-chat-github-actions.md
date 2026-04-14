# Google Chat Notifications from GitHub Actions: Complete Research

**Date:** 2026-04-14  
**Focus:** Practical implementation details for sending notifications to Google Chat from GitHub Actions workflows

---

## 1. Google Chat Incoming Webhooks Overview

### Webhook URL Format

Google Chat incoming webhooks use a specific URL structure:

```
https://chat.googleapis.com/v1/spaces/SPACE_ID/messages?key=KEY&token=TOKEN
```

**Key components:**
- `SPACE_ID`: Unique identifier for the Chat space (room/channel)
- `key`: Shared across all webhooks in a space (public parameter)
- `token`: Unique per webhook (acts as the security credential)

**Critical security note:** The webhook URL itself contains authentication credentials. Never commit it to version control or share it publicly. Always store it as a GitHub secret.

### Rate Limiting

- **Quota:** 1 request per second per space (shared among all webhooks)
- **Scope:** The quota is shared across all webhooks in the same space
- **Implication:** If you have multiple workflows posting to the same space, they collectively share this 1 req/sec limit

### One-Way Communication

Webhooks are strictly one-way:
- You can send messages TO Google Chat
- You cannot receive user interactions or responses
- Response data is limited to only `name` and `thread.name` fields
- Best suited for notifications, not interactive applications

---

## 2. Creating an Incoming Webhook in Google Chat

### Step-by-Step Setup

1. **Open Google Chat** and navigate to the space where you want notifications
2. **Click the space menu** (expand menu next to the space title)
3. **Select "Apps & integrations"**
4. **Click "Add webhooks"** (or "Manage webhooks" if already configured)
5. **Enter webhook details:**
   - Name: e.g., "GitHub Actions Notifications"
   - Avatar URL (optional): Custom icon for the webhook
6. **Click "Save"**
7. **Copy the webhook URL** from the "More" menu or confirmation dialog

### Storing the Webhook URL as a GitHub Secret

**Best practice approach:**

1. Go to your GitHub repository
2. Navigate to **Settings → Secrets and variables → Actions**
3. Click **"New repository secret"**
4. **Name:** `GOOGLE_CHAT_WEBHOOK_URL` (or similar)
5. **Value:** Paste the entire webhook URL from Google Chat
6. Click **"Add secret"**

**Why use secrets:**
- Prevents accidental exposure in logs or version control
- GitHub masks secret values in workflow output
- Accessible only to workflows in that repository
- Can be scoped to specific environments (production, staging, etc.)

**In your workflow, reference it as:**
```yaml
webhook_url: ${{ secrets.GOOGLE_CHAT_WEBHOOK_URL }}
```

---

## 3. Best GitHub Actions for Google Chat Notifications

### Official Google Action (Recommended)

**Action:** `google-github-actions/send-google-chat-webhook`  
**Repository:** https://github.com/google-github-actions/send-google-chat-webhook  
**Latest version:** v0.0.2

**Why choose this:**
- Officially maintained by Google
- Direct support from Google Cloud team
- Guaranteed compatibility with Google Chat API
- Minimal dependencies

**Basic usage:**
```yaml
- id: 'notify_google_chat'
  uses: 'google-github-actions/send-google-chat-webhook@v0.0.2'
  with:
    webhook_url: '${{ secrets.GOOGLE_CHAT_WEBHOOK_URL }}'
    mention: '<users/all>'
```

**Key inputs:**
- `webhook_url` (required): Your Google Chat webhook URL
- `mention` (optional): Mention users with `<users/all>` or specific user IDs

### Popular Community Alternatives

1. **delivery-much/actions-chat** (v1.0.6)
   - Supports new pull request and release notifications
   - Good for simple use cases
   - Usage: `uses: delivery-much/actions-chat@v1.0.6`

2. **SimonScholz/google-chat-action**
   - Supports Cards v2 syntax for advanced formatting
   - Better for rich, formatted messages
   - Good if you need complex card layouts

3. **Co-qn/google-chat-notification**
   - Community-maintained alternative
   - Simpler configuration for basic notifications

**Recommendation:** Start with the official Google action for reliability and long-term support. Switch to community actions only if you need specific features (like Cards v2 support) that the official action doesn't provide.

---

## 4. JSON Payload Formats

### Simple Text Message

The most basic format for sending plain text:

```json
{
  "text": "Hello from GitHub Actions!"
}
```

**Use case:** Quick status updates, simple notifications

### Cards V2 Format (Rich Messages)

For formatted, interactive messages with sections, buttons, and images:

```json
{
  "cardsV2": [
    {
      "cardId": "unique-card-id-123",
      "card": {
        "header": {
          "title": "Deployment Status",
          "subtitle": "Production Release",
          "imageUrl": "https://example.com/icon.png",
          "imageType": "CIRCLE"
        },
        "sections": [
          {
            "header": "Build Information",
            "collapsible": true,
            "widgets": [
              {
                "decoratedText": {
                  "topLabel": "Status",
                  "text": "Success"
                }
              },
              {
                "decoratedText": {
                  "topLabel": "Commit",
                  "text": "abc1234"
                }
              },
              {
                "buttonList": {
                  "buttons": [
                    {
                      "text": "View Build",
                      "onClick": {
                        "openLink": {
                          "url": "https://github.com/owner/repo/actions/runs/123"
                        }
                      }
                    },
                    {
                      "text": "View Commit",
                      "onClick": {
                        "openLink": {
                          "url": "https://github.com/owner/repo/commit/abc1234"
                        }
                      }
                    }
                  ]
                }
              }
            ]
          }
        ]
      }
    }
  ]
}
```

**Card V2 components:**
- `header`: Title, subtitle, and optional image
- `sections`: Logical groupings of content
- `widgets`: Individual elements (text, buttons, images, etc.)
- `decoratedText`: Key-value pairs for displaying information
- `buttonList`: Interactive buttons with links

**Constraints:**
- Maximum message size: 32,000 bytes (including text and cards)
- Field names are case-sensitive
- Missing required fields will cause validation errors

### Hybrid Format (Text + Cards)

You can combine text with cards:

```json
{
  "text": "Deployment completed successfully",
  "cardsV2": [
    {
      "cardId": "deployment-card",
      "card": {
        "header": {
          "title": "Deployment Details"
        },
        "sections": [
          {
            "widgets": [
              {
                "decoratedText": {
                  "topLabel": "Environment",
                  "text": "Production"
                }
              }
            ]
          }
        ]
      }
    }
  ]
}
```

---

## 5. Practical GitHub Actions Workflow Examples

### Example 1: Simple Notification on Workflow Completion

```yaml
name: Deploy and Notify

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy application
        run: |
          echo "Deploying..."
          # Your deployment commands here
      
      - name: Notify Google Chat on Success
        if: success()
        uses: google-github-actions/send-google-chat-webhook@v0.0.2
        with:
          webhook_url: ${{ secrets.GOOGLE_CHAT_WEBHOOK_URL }}
          mention: '<users/all>'
      
      - name: Notify Google Chat on Failure
        if: failure()
        uses: google-github-actions/send-google-chat-webhook@v0.0.2
        with:
          webhook_url: ${{ secrets.GOOGLE_CHAT_WEBHOOK_URL }}
          mention: '<users/all>'
```

### Example 2: Conditional Notification Based on Inputs

```yaml
name: Manual Deployment

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to ${{ inputs.environment }}
        run: echo "Deploying to ${{ inputs.environment }}"
      
      - name: Notify Google Chat
        if: ${{ inputs.environment == 'production' }}
        uses: google-github-actions/send-google-chat-webhook@v0.0.2
        with:
          webhook_url: ${{ secrets.GOOGLE_CHAT_WEBHOOK_URL }}
          mention: '<users/all>'
```

### Example 3: Using curl for Custom Payloads

If you need more control over the payload format, use `curl` directly:

```yaml
name: Custom Notification

on:
  push:
    branches: [main]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Send Custom Google Chat Message
        run: |
          curl -X POST \
            -H 'Content-Type: application/json' \
            -d '{
              "text": "Build completed",
              "cardsV2": [
                {
                  "cardId": "build-card",
                  "card": {
                    "header": {
                      "title": "GitHub Actions Build"
                    },
                    "sections": [
                      {
                        "widgets": [
                          {
                            "decoratedText": {
                              "topLabel": "Repository",
                              "text": "${{ github.repository }}"
                            }
                          },
                          {
                            "decoratedText": {
                              "topLabel": "Branch",
                              "text": "${{ github.ref_name }}"
                            }
                          },
                          {
                            "decoratedText": {
                              "topLabel": "Commit",
                              "text": "${{ github.sha }}"
                            }
                          }
                        ]
                      }
                    ]
                  }
                }
              ]
            }' \
            '${{ secrets.GOOGLE_CHAT_WEBHOOK_URL }}'
```

---

## 6. Best Practices for Production Use

### Secret Management

1. **Use repository secrets** for webhook URLs (never hardcode)
2. **Use environment secrets** if you have multiple spaces (dev, staging, prod)
3. **Rotate webhook URLs periodically** (delete old, create new in Google Chat)
4. **Audit secret access** through GitHub's audit logs

### Error Handling

1. **Always use conditional steps** to notify on success/failure:
   ```yaml
   if: success()  # or failure(), always()
   ```

2. **Add timeout handling** for webhook requests:
   ```yaml
   timeout-minutes: 5
   ```

3. **Log webhook responses** for debugging (but mask sensitive data)

### Message Design

1. **Keep messages concise** - include only essential information
2. **Use mentions sparingly** - `<users/all>` notifies everyone; use specific user IDs for targeted alerts
3. **Include actionable links** - buttons to GitHub Actions runs, commits, or deployments
4. **Use consistent formatting** - standardize card layouts across workflows

### Rate Limiting Considerations

1. **Batch notifications** if you have multiple workflows posting to the same space
2. **Stagger workflow triggers** to avoid hitting the 1 req/sec quota
3. **Monitor webhook failures** - implement retry logic if needed:
   ```yaml
   - name: Notify with Retry
     uses: google-github-actions/send-google-chat-webhook@v0.0.2
     with:
      webhook_url: ${{ secrets.GOOGLE_CHAT_WEBHOOK_URL }}
    continue-on-error: true
   ```

### Permissions

Minimal permissions needed in your workflow:

```yaml
permissions:
  contents: 'read'
  id-token: 'write'  # Only if using OIDC authentication
```

For most webhook notifications, you only need `contents: read`.

---

## 7. Troubleshooting Common Issues

### Webhook URL Not Working

- **Verify the URL is correct** - copy directly from Google Chat
- **Check the space exists** - ensure you have access to the Chat space
- **Verify the webhook is active** - check in "Apps & integrations"
- **Check rate limits** - if posting frequently, you may hit the 1 req/sec quota

### Message Not Appearing

- **Validate JSON syntax** - use a JSON validator for card payloads
- **Check message size** - ensure payload is under 32,000 bytes
- **Verify field names** - JSON is case-sensitive
- **Check for special characters** - escape quotes and newlines properly

### Cards Not Rendering

- **Use correct Cards V2 format** - not Cards V1
- **Verify widget structure** - each widget must have valid properties
- **Check image URLs** - ensure images are publicly accessible
- **Test with simple text first** - then gradually add card complexity

---

## 8. Summary Table: Quick Reference

| Aspect | Details |
|--------|---------|
| **Webhook URL Format** | `https://chat.googleapis.com/v1/spaces/SPACE_ID/messages?key=KEY&token=TOKEN` |
| **Rate Limit** | 1 request/second per space (shared) |
| **Authentication** | Token embedded in URL (no OAuth needed) |
| **Recommended Action** | `google-github-actions/send-google-chat-webhook@v0.0.2` |
| **Simple Payload** | `{"text": "message"}` |
| **Rich Payload** | Cards V2 with `cardsV2` field |
| **Max Message Size** | 32,000 bytes |
| **Secret Storage** | GitHub Settings → Secrets and variables → Actions |
| **Communication Type** | One-way (send only, no responses) |
| **Best Use Case** | Notifications, status updates, alerts |

---

## Sources

- [Google's Official Send Google Chat Webhook Action](https://github.com/google-github-actions/send-google-chat-webhook)
- [Google Chat Webhook Quickstart](https://developers.google.com/workspace/chat/quickstart/webhooks)
- [Google Chat Messages Overview](https://developers.google.com/chat/messages-overview)
- [Google Chat API Cards Reference](https://developers.google.com/workspace/chat/api/reference/rest/v1/cards)
- [How to Use Google Chat Webhooks: A Complete Guide](https://softwareengineeringstandard.com/2025/09/01/google-chat-webhook/)
- [GitHub Marketplace: Send Google Chat Messages](https://github.com/marketplace/actions/send-google-chat-messages)
