Project Name:Pub_ Issue-Management
Current State: Figma design available
Goal: Creation of the screen with the new design language.

Project Overview

The Issue Management System is a comprehensive web application designed for managing journal issues throughout their publication lifecycle. It provides tools for creating issues, managing article lineups, arranging folios, tracking publication schedules, and monitoring workflow milestones.

Primary Purpose:
- Streamline the journal issue creation and publication process
- Manage articles across multiple workflow stages
- Track publication schedules for multiple journals
- Coordinate editorial reviews and folio arrangement

Target Users:
- Journal Editors
- Editorial Assistants
- Production Managers
- Publishing Coordinators


Key Features

1. Issue Creation
- **Create New Issues**: Multi-step modal workflow for creating journal issues
The fields will be disabled until the journal is selected.
- **Auto-population**: Automatic pre-filling of mandatory fields when journal is selected:
  - Volume & Issue numbers (from journal defaults)
  - Cover Month (Same month as the Publication date and This is to be next month from the current month)
  - Publication Date (30 days from today)
  - Issue Close Date (15 days before publication)
  - Issue Title
  - Issue Type (defaults to "Regular")
  - Output Format (defaults to "Print & Online")
- **3-Step Workflow**:
  1. Issue Details
  2. Article Lineup (with save/confirm options)
  3. Review

2. Article Management
- **Article Selection**:   
  - Table view options for available article
  - Search and filter by milestone, status, and article type
  - Sort by accepted date or expected publish date
- **Article Lineup**: 
  - Add/remove articles from issues
  - View assigned article counts
  - Edit lineup even after confirmation
- **Milestone Tracking**: 
Articles progress through:
  - Copyediting
  - Copyediting Review
  - Proofing
  - Proof Review
  - PAP
  - Folio Creation

3. Publication Workflow
The system tracks 7 workflow steps for each issue:

**Step 1: Articles Line Up**
- Confirm article selection
- Edit articles even after confirmation
- View articles in modal

**Step 2: Folio Creation**
- Arrange articles in publication order
- Drag-and-drop interface
- Set page ranges for each article
- Confirmed articles automatically move to this step

**Step 3: Folio Preparation**
- Prepares output that will be reviewed in the final review. 
- Manual Step

**Step 4: Final Review**
- Editorial final review
- Quality checks

**Step 5: Print**
- Print preparation
- Print approval

**Step 6: Online Publication**
- Digital publication
- Final release

 4. Folio Arrangement
- **Drag-and-Drop Interface**: Reorder articles visually
- **Page Range Assignment**: Set start and end pages for each article
- **Auto-calculation**: Automatic page counting
- **Visual Feedback**: Real-time updates during arrangement
- **Review Modal**: Dedicated modal for folio review and approval

6. Issue Tracking
- **Data Table View**: 
  - Sortable columns (journal, volume, issue, cover month, publication date)
  - Milestone badges with color coding
  - Article count display
  - Action buttons (Details, Schedule)

- **Detail Page**:
  - Complete workflow visualization
  - Timeline tracking (started, ended, duration)
  - Status indicators (completed, in-progress, not-started)
  - Estimated completion dates

## Architecture & Components

### Core Components

#### 1. **App.tsx**
- Root application component
- Manages global state for issues
- Routing and navigation logic
- Handles issue creation callbacks
- Empty state management

#### 2. **CreateIssueModal.tsx**
- Multi-step modal for issue creation
- **Step 1**: Issue details form with auto-population
- **Step 2**: Article selection with table views
- **Step 3**: Review and confirmation
- Manages article categorization (saved vs. confirmed)
- Handles milestone updates for confirmed articles
- Features:
  - Journal combobox with search
  - Cover month selector
  - Date pickers with validation
  - Issue type and output format segmented controls
  - Article sorting and filtering
  - View mode toggle (card/table)

#### 3. **IssueTable.tsx**
Data table for all issues
- Columns: Journal, Volume/Issue, Cover Month, Publication Date, Milestone, Articles
- Sortable headers
- Schedule button (opens UploadScheduleModal)
- Details button (navigates to detail page)
- Milestone badge with color coding
- Empty state integration

#### 4. **IssueDetailPage.tsx**
- Comprehensive issue detail view
- Workflow step visualization with connector lines
- Timeline tracking for each step
- Action buttons based on workflow state
- **StepNode Component**: Individual workflow step card
  - Circle status indicator
  - Timeline details (start, end, duration, estimates)
  - CTAs (Add/Edit Articles, Arrange Folio, Review, etc.)
  - Confirmation badges with approver info
  - Edit functionality even after confirmation
- Modals:
  - View/Edit Articles Modal
  - Folio Arrange Modal (FolioArrangeTable)
  - Editor Review Modal
  - Folio Review Modal

#### 5. **UploadScheduleModal.tsx**
- This will for now will have a disabled button and when the user hover on it, it will display a tool tip. 

#### 6. **FolioArrangeTable.tsx**
- Drag-and-drop article arrangement
- Uses react-dnd for reordering
- Page range input fields
- Visual drag handles
- Save and cancel actions

#### 7. **IssueEmptyState.tsx**
- Displayed when no issues exist
- Custom SVG illustration
- Call-to-action to create first issue
- Schedule upload option

#### 8. **IssueHistory.tsx**
 - Issue History will show those issue which has completed the process of Online publication milestone.

#### 9. **Header.tsx**
- Application header with navigation
- Product logo
- User profile section

#### 10. **Navigation.tsx**
- Navigation between different section of the product in the left panel.
The navigation would be there for:
     - Dashboard
     - My Tasks
     - Conversations
     - Insights
     - Articles 
     - Issues
- Inside Issue Table page, there will be tab navigation between Issue in progress and Issue History
- In My tasks, There will be tabs like Articles, Issues and Conversation. 
      When there is no contentpresent in that tab, it will not be visible. 

#### 10. **MyTasks.tsx**
- Itemas will be shown under when it is a user denpendent process
- The user can take action over there.


## Workflows

### Issue Creation Workflow

```
1. User clicks "Create Issue"
   ↓
2. Modal opens - Step 1: Issue Details
   - User selects journal
   - All mandatory fields auto-populate
   - User can edit auto-populated field
   - Validation: journal, dates, volume/issue required
   ↓
3. Click "Next" → Step 2: Article Lineup
   - View articles in table view
   - Filter by milestone and Article Type
   - Sort by accepted/publish date
   - Select articles for Issue
   - Click "Save lineup as draft " OR "Confirm lineup"
   ↓
4. Step 3: Review & Confirmation
   - Shows read-only issue details
   - Shows saved/confirmed articles
   - Info messages about next steps
   - Click "Create Issue"
   ↓
5. Issue Created
   - Issue added to table
   - Confirmed articles → Folio Creation milestone
   - Active workflow step set (0 or 1)
   - Success notification
```

### Article Lineup Confirmation Workflow

```
Saved Articles:
- Marked for lineup but not finalized
- Can be modified in Step 2
- Will be in "Articles Line Up" step (Step 0)

Confirmed Articles:
- Finalized for publication
- Automatically moved to "Folio Creation" milestone
- Issue starts at activeStepIndex = 1
- Folio arrangement becomes the next action
```

### Folio Arrangement Workflow

```
1. User on Issue Detail Page (Step 1: Folio Creation)
   ↓
2. Click "Arrange Folio"
   ↓
3. FolioArrangeTable opens
   - Lists all assigned articles
   - Drag handles for reordering
   - Page range input fields
   ↓
4. User arranges articles
   - Drag-and-drop to reorder
   - Set start/end pages
   ↓
5. Click "Save"
   ↓
6. Folio arrangement saved
   - Article order persisted
   - Page ranges saved
   - Ready for next workflow step
```

### My Tasks Workflow
All the issue's process that is with the user for action, will be shown in this step
   - The user can take action from the specific table itself
or
   - The user click on a details page from the table
   ↓
   - Lands into Issue Detail Page

---
Screen Relationship
App (Root)
├── Header
│   ├── Dashboard Collapse Icon and Product Logo
│   └── User Profile
│       └── Logout
├── Navigation (Left Panel)
│   ├── Dashboard
│   ├── My Tasks
│   │   ├── Tab: Articles
│   │   │   └── Article Detail Page
│   │   ├── Tab: Issues
│   │   │   └── Issue Detail Page
│   │   └── Tab: Conversations
│   │       └── Conversation Detail Page
│   ├── Conversations
│   │   └── Conversation Detail Page
│   ├── Insights
│   ├── Articles
│   │   ├── Tab: Articles In Progress
│   │   │   └── Article Table
│   │   └── Tab: Articles History
│   │       └── Article History Table
│   └── Issues
│       ├── Tab: Issues In Progress
│       │   ├── Issue Table
│       │   │   ├── Create Issue Button
│       │   │   │   └── Create Issue Modal
│       │   │   │       ├── Step 1: Issue Details
│       │   │   │       ├── Step 2: Article Lineup
│       │   │   │       └── Step 3: Review
│       │   │   ├── Details Button
│       │   │   │   └── Issue Detail Page
│       │   │   │       ├── Step 1: Articles Line Up
│       │   │   │       │   └── View / Edit Articles Modal
│       │   │   │       ├── Step 2: Folio Creation
│       │   │   │       │   └── Folio Arrange Modal
│       │   │   │       │       └── FolioArrangeTable (drag-and-drop)
│       │   │   │       ├── Step 3: Folio Preparation
│       │   │   │       ├── Step 4: Folio Review
│       │   │   │       │   └── Folio Review Modal
│       │   │   │       │       └── Issue Details
│       │   │   │       │       └── Output
│       │   │   │       │       └── Folio Structure
│       │   │   │       ├── Step 5: Print
│       │   │   │       └── Step 6: Online Publication
│       │   │   └── Schedule Button
│       │   │       └── Upload Schedule Modal
│       │   │           ├── Option 1: File Upload
│       │   │           └── Option 2: Manual Entry
│       │   │               ├── Step 1: Select Journal
│       │   │               ├── Step 2: Fill Schedule Table
│       │   │               └── Step 3: View Mode
│       │   │                   ├── Tab: All Journal
│       │   │                   └── Tab: Each Journal
│       │   └── Empty State
│       │       ├── IssueEmptyState
│       │       │   ├── Create Issue CTA
│       │       │   └── Upload Schedule CTA
│       │       ├── IssueInProgressEmptyState
│       │       │   ├── Create Issue CTA
│       │       │   └── Upload Schedule CTA / View Schedule
│       │       └── IssueHistoryEmptyState
│       │           ├── View Issues In Progress CTA
│       │           └── Upload Schedule CTA / View Schedule
│       └── Tab: Issues History
│           └── Issue History Table

Quality Standards

All features still work after migration
Design is consistent across all screens
Code is maintainable and well-organized
Design system is reusable for future projects
Ensure component usage is consistent across



Mitigation Strategies

Break into small phases
Test frequently
Ask for help when stuck










