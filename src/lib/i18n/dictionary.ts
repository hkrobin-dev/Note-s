import type { Locale } from "@/lib/i18n/config";

/**
 * Bangla translations keyed by the exact English source string.
 *
 * Using the English text as the key keeps component code readable
 * (`t("Tasks")`) and makes missing translations gracefully fall back to
 * English instead of showing a raw identifier.
 *
 * Templates use `{name}` placeholders, e.g. `t("{count} task{s}", { count: 3, s: "s" })`.
 */
const BN: Record<string, string> = {
  // ---------------------------------------------------------------------------
  // Navigation, shell, branding
  // ---------------------------------------------------------------------------
  Overview: "ওভারভিউ",
  Work: "কাজ",
  Money: "অর্থ",
  Utilities: "ইউটিলিটি",
  Dashboard: "ড্যাশবোর্ড",
  Tasks: "কাজসমূহ",
  Calendar: "ক্যালেন্ডার",
  Projects: "প্রকল্প",
  Notes: "নোট",
  Expenses: "খরচ",
  "Budgets & reports": "বাজেট ও রিপোর্ট",
  Reminders: "রিমাইন্ডার",
  Files: "ফাইল",
  Search: "খুঁজুন",
  Settings: "সেটিংস",
  "Quick add": "দ্রুত যোগ করুন",
  Home: "হোম",
  "Personal workspace": "ব্যক্তিগত ওয়ার্কস্পেস",
  "Local workspace": "লোকাল ওয়ার্কস্পেস",
  Appearance: "চেহারা",
  Language: "ভাষা",
  "App language": "অ্যাপের ভাষা",
  "Choose the language used across the whole app.": "পুরো অ্যাপে ব্যবহৃত ভাষা বেছে নিন।",
  "Bangla": "বাংলা",
  "Toggle color theme": "রঙের থিম পরিবর্তন করুন",
  "Toggle language": "ভাষা পরিবর্তন করুন",
  "Switch to Bangla": "বাংলায় পরিবর্তন করুন",
  "Switch to English": "ইংরেজিতে পরিবর্তন করুন",
  "Main navigation": "প্রধান নেভিগেশন",
  "Open navigation": "নেভিগেশন খুলুন",
  "Close navigation": "নেভিগেশন বন্ধ করুন",
  "Close dialog": "ডায়ালগ বন্ধ করুন",
  "Loading page": "পৃষ্ঠা লোড হচ্ছে",
  "Loading…": "লোড হচ্ছে…",
  "Search…": "খুঁজুন…",

  // ---------------------------------------------------------------------------
  // Greetings & date lines
  // ---------------------------------------------------------------------------
  "Good night": "শুভ রাত্রি",
  "Good morning": "শুভ সকাল",
  "Good afternoon": "শুভ অপরাহ্ন",
  "Good evening": "শুভ সন্ধ্যা",
  "Here is your day at a glance.": "এক নজরে আপনার দিন।",

  // ---------------------------------------------------------------------------
  // Shared labels & statuses
  // ---------------------------------------------------------------------------
  "To do": "করতে হবে",
  "In progress": "চলমান",
  Done: "সম্পন্ন",
  Cancelled: "বাতিল",
  Low: "নিম্ন",
  Medium: "মধ্যম",
  High: "উচ্চ",
  Urgent: "জরুরি",
  Planning: "পরিকল্পনা",
  Active: "সক্রিয়",
  "On hold": "স্থগিত",
  Completed: "সম্পন্ন",
  Archived: "আর্কাইভ করা",
  Cash: "নগদ",
  Card: "কার্ড",
  "Bank transfer": "ব্যাংক ট্রান্সফার",
  "Mobile wallet": "মোবাইল ওয়ালেট",
  Other: "অন্যান্য",
  Pending: "অপেক্ষমাণ",
  Sent: "পাঠানো হয়েছে",
  Failed: "ব্যর্থ",
  General: "সাধারণ",
  Meeting: "সভা",
  Deadline: "সময়সীমা",
  Personal: "ব্যক্তিগত",
  Confirmed: "নিশ্চিত",
  Tentative: "সম্ভাব্য",
  "All day": "সারাদিন",
  Today: "আজ",
  Tomorrow: "আগামীকাল",
  Yesterday: "গতকাল",
  All: "সব",
  "No due date": "কোনো শেষ সময় নেই",
  "No deadline": "কোনো সময়সীমা নেই",
  "No tasks": "কোনো কাজ নেই",
  "No events": "কোনো ইভেন্ট নেই",
  Overdue: "সময় পার হয়েছে",
  "Next 7 days": "আগামী ৭ দিন",
  Reminder: "রিমাইন্ডার",
  "All day event": "সারাদিনের ইভেন্ট",
  "Uncategorized": "বিভাগহীন",

  // ---------------------------------------------------------------------------
  // Common actions
  // ---------------------------------------------------------------------------
  Cancel: "বাতিল",
  Save: "সংরক্ষণ",
  "Save changes": "পরিবর্তন সংরক্ষণ করুন",
  Delete: "মুছুন",
  Edit: "সম্পাদনা",
  Add: "যোগ করুন",
  "Try again": "আবার চেষ্টা করুন",
  "Clear": "মুছুন",
  "Clear filters": "ফিল্টার মুছুন",
  "Clear filter": "ফিল্টার মুছুন",
  "Clear search": "সার্চ মুছুন",
  "Reset filters": "ফিল্টার রিসেট করুন",
  Refresh: "রিফ্রেশ",
  "Refresh report": "রিপোর্ট রিফ্রেশ করুন",
  "View all": "সব দেখুন",
  "View tasks": "কাজ দেখুন",
  "View in {target}": "{target}-এ দেখুন",
  "Optional": "ঐচ্ছিক",
  "Optional details": "ঐচ্ছিক বিবরণ",
  "Optional note": "ঐচ্ছিক নোট",
  "e.g. {example}": "যেমন: {example}",

  // ---------------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------------
  "Spent this month": "এই মাসে খরচ",
  "Monthly budget": "মাসিক বাজেট",
  "Budget remaining": "বাকি বাজেট",
  "Budget used": "বাজেট ব্যবহৃত",
  "{pct}% of planned budget": "পরিকল্পিত বাজেটের {pct}%",
  "Planned across categories": "বিভাগ অনুযায়ী পরিকল্পিত",
  "No budget set yet": "এখনও বাজেট নির্ধারিত হয়নি",
  "Income this month {amount}": "এই মাসের আয় {amount}",
  "{count} task{s} left today": "আজ বাকি {count}টি কাজ",
  "Today's tasks": "আজকের কাজ",
  "{done} done · {remaining} remaining": "{done} সম্পন্ন · {remaining} বাকি",
  "Nothing due today": "আজ কোনো কাজ বাকি নেই",
  "Enjoy the clear calendar, or plan ahead by adding a task.":
    "ফাঁকা দিনটি উপভোগ করুন, অথবা নতুন কাজ যোগ করে এগিয়ে পরিকল্পনা করুন।",
  "Add a task": "কাজ যোগ করুন",
  "Today's schedule": "আজকের সময়সূচি",
  "No tasks planned": "কোনো কাজ পরিকল্পিত নেই",
  "No events scheduled": "কোনো ইভেন্ট নেই",
  "Your day is open — block time for focused work.":
    "আপনার দিন ফাঁকা — মনোযোগী কাজের জন্য সময় বরাদ্দ করুন।",
  "{count} open": "{count}টি চলমান",
  "due {date}": "শেষ সময় {date}",
  "Recent activity": "সাম্প্রতিক কার্যকলাপ",
  "No activity yet": "এখনও কোনো কার্যকলাপ নেই",
  "Could not load the dashboard": "ড্যাশবোর্ড লোড করা যায়নি",
  created: "তৈরি হয়েছে",
  updated: "আপডেট হয়েছে",
  deleted: "মুছে ফেলা হয়েছে",
  completed: "সম্পন্ন হয়েছে",
  archived: "আর্কাইভ করা হয়েছে",
  Task: "কাজ",
  Event: "ইভেন্ট",
  Expense: "খরচ",
  Note: "নোট",
  Project: "প্রকল্প",
  File: "ফাইল",

  // ---------------------------------------------------------------------------
  // Tasks
  // ---------------------------------------------------------------------------
  "{date} — capture what matters and keep the list honest.":
    "{date} — গুরুত্বপূর্ণ কাজগুলো লিখে রাখুন এবং তালিকাটি সঠিক রাখুন।",
  "Open tasks": "চলমান কাজ",
  "Due today": "আজ শেষ হবে",
  "Completed today": "আজ সম্পন্ন",
  "Could not save the change.": "পরিবর্তন সংরক্ষণ করা যায়নি।",
  "Filter by due date": "শেষ সময় অনুযায়ী ফিল্টার",
  "Filter by priority": "অগ্রাধিকার অনুযায়ী ফিল্টার",
  "All priorities": "সব অগ্রাধিকার",
  "Search tasks…": "কাজ খুঁজুন…",
  "Show completed": "সম্পন্ন দেখান",
  "Task list": "কাজের তালিকা",
  "{count} task{s}": "{count}টি কাজ",
  "{count} task{s} matching filters": "ফিল্টারে মেলা {count}টি কাজ",
  "Could not load tasks": "কাজ লোড করা যায়নি",
  "No tasks match these filters": "এই ফিল্টারে কোনো কাজ মেলেনি",
  "No tasks yet": "এখনও কোনো কাজ নেই",
  "Try a different search or reset the filters.": "অন্য কিছু খুঁজুন বা ফিল্টার রিসেট করুন।",
  "Add your first task above to get started.": "শুরু করতে উপরে আপনার প্রথম কাজ যোগ করুন।",
  "Showing {count} task{s}": "{count}টি কাজ দেখানো হচ্ছে",
  "completed tasks are hidden": "সম্পন্ন কাজগুলো লুকানো আছে",
  "Tip: press Enter in the composer to add a task quickly.":
    "টিপ: দ্রুত কাজ যোগ করতে কম্পোজারে Enter চাপুন।",
  "New task title": "নতুন কাজের শিরোনাম",
  "Add a task — what needs to be done?": "কাজ যোগ করুন — কী করতে হবে?",
  "Add task": "কাজ যোগ করুন",
  "Priority": "অগ্রাধিকার",
  "Due": "শেষ সময়",
  "Clear due date": "শেষ সময় মুছুন",
  "Optional — set a priority and due date if it matters.":
    "ঐচ্ছিক — প্রয়োজন হলে অগ্রাধিকার ও শেষ সময় দিন।",
  "Status": "অবস্থা",
  "Task title": "কাজের শিরোনাম",
  "Mark “{title}” as to do": "“{title}” আবার করতে হবে হিসেবে চিহ্নিত করুন",
  "Mark “{title}” as done": "“{title}” সম্পন্ন হিসেবে চিহ্নিত করুন",
  rescheduled: "পুনঃনির্ধারিত",
  "Edit “{title}”": "“{title}” সম্পাদনা",
  "Delete “{title}”": "“{title}” মুছুন",
  "Today {time}": "আজ {time}",
  "Tomorrow {time}": "আগামীকাল {time}",
  "{date}, {time}": "{date}, {time}",

  // ---------------------------------------------------------------------------
  // Calendar
  // ---------------------------------------------------------------------------
  Month: "মাস",
  Week: "সপ্তাহ",
  Day: "দিন",
  Sun: "রবি",
  Mon: "সোম",
  Tue: "মঙ্গল",
  Wed: "বুধ",
  Thu: "বৃহ",
  Fri: "শুক্র",
  Sat: "শনি",
  "Could not load event": "ইভেন্ট লোড করা যায়নি",
  "Start and end times are required.": "শুরুর ও শেষের সময় আবশ্যক।",
  "The end time must be after the start time.": "শেষের সময় শুরুর সময়ের পরে হতে হবে।",
  "Could not save event": "ইভেন্ট সংরক্ষণ করা যায়নি",
  "Delete “{title}”?": "“{title}” মুছবেন?",
  "Plan events, deadlines, and the shape of your week.":
    "ইভেন্ট, সময়সীমা এবং আপনার সপ্তাহের পরিকল্পনা সাজান।",
  Previous: "পূর্ববর্তী",
  Next: "পরবর্তী",
  "Calendar view": "ক্যালেন্ডার ভিউ",
  "Add event": "ইভেন্ট যোগ করুন",
  "Could not load calendar": "ক্যালেন্ডার লোড করা যায়নি",
  "+{count} more": "আরও {count}টি",
  "Nothing scheduled": "কিছু নির্ধারিত নেই",
  "This day is free. Add an event to block time.":
    "এই দিনটি ফাঁকা। সময় বরাদ্দ করতে একটি ইভেন্ট যোগ করুন।",
  Agenda: "এজেন্ডা",
  "Select another day or create an event.": "অন্য দিন বেছে নিন বা ইভেন্ট তৈরি করুন।",
  "Syncing…": "সিঙ্ক হচ্ছে…",
  "Edit event": "ইভেন্ট সম্পাদনা",
  "New event": "নতুন ইভেন্ট",
  "Times are shown in Asia/Dhaka.": "সময় এশিয়া/ঢাকা অনুযায়ী দেখানো হচ্ছে।",
  "Create event": "ইভেন্ট তৈরি করুন",
  "Type": "ধরন",
  "Location": "স্থান",
  "Description": "বিবরণ",
  "Private notes": "ব্যক্তিগত নোট",
  "e.g. Project review": "যেমন: প্রকল্প পর্যালোচনা",
  "e.g. Family lunch": "যেমন: পারিবারিক দুপুরের খাবার",
  "Edit {title}": "{title} সম্পাদনা",
  "Delete {title}": "{title} মুছুন",
  "{count} event{s}": "{count}টি ইভেন্ট",

  // ---------------------------------------------------------------------------
  // Expenses
  // ---------------------------------------------------------------------------
  "Every purchase in one place, grouped by day and category.":
    "সব খরচ এক জায়গায়, দিন ও বিভাগ অনুযায়ী সাজানো।",
  "Add expense": "খরচ যোগ করুন",
  "Total spent": "মোট খরচ",
  Transactions: "লেনদেন",
  Categories: "বিভাগ",
  "Logged today": "আজ লিপিবদ্ধ",
  "Could not save the expense.": "খরচ সংরক্ষণ করা যায়নি।",
  "All expenses": "সব খরচ",
  "{count} record{s}": "{count}টি রেকর্ড",
  "{count} record{s} matching search": "সার্চে মেলা {count}টি রেকর্ড",
  "Search expenses…": "খরচ খুঁজুন…",
  "Could not load expenses": "খরচ লোড করা যায়নি",
  "No matching expenses": "মিলে যাওয়া খরচ নেই",
  "No expenses yet": "এখনও কোনো খরচ নেই",
  "Try a different description, vendor, or category.":
    "অন্য বিবরণ, বিক্রেতা বা বিভাগ চেষ্টা করুন।",
  "Log your first expense to start tracking.": "ট্র্যাকিং শুরু করতে আপনার প্রথম খরচ লিপিবদ্ধ করুন।",
  "Edit expense": "খরচ সম্পাদনা",
  "New expense": "নতুন খরচ",
  "Update the recorded transaction.": "লিপিবদ্ধ লেনদেন আপডেট করুন।",
  "Record a purchase in seconds.": "কয়েক সেকেন্ডে একটি ক্রয় লিপিবদ্ধ করুন।",
  "Amount (BDT)": "পরিমাণ (টাকা)",
  "Date & time": "তারিখ ও সময়",
  "Category": "বিভাগ",
  "Use an existing category or type a new ID.": "বিদ্যমান বিভাগ ব্যবহার করুন বা নতুন আইডি লিখুন।",
  "Payment method": "পেমেন্ট পদ্ধতি",
  "Vendor": "বিক্রেতা",
  "Where did you spend it?": "কোথায় খরচ করেছেন?",
  "Delete this expense? This cannot be undone.": "এই খরচটি মুছবেন? এটি ফিরিয়ে আনা যাবে না।",
  "Delete expense": "খরচ মুছুন",
  "e.g. cat_groceries": "যেমন: cat_groceries",

  // ---------------------------------------------------------------------------
  // Notes
  // ---------------------------------------------------------------------------
  "A lightweight knowledge base for ideas, meeting notes, and reference material.":
    "আইডিয়া, মিটিং নোট এবং রেফারেন্সের জন্য হালকা নলেজ বেস।",
  "New note": "নতুন নোট",
  "Favorites": "প্রিয়",
  "Showing": "দেখানো হচ্ছে",
  "Filter notes": "নোট ফিল্টার",
  "All notes": "সব নোট",
  "Search notes…": "নোট খুঁজুন…",
  "Could not load notes": "নোট লোড করা যায়নি",
  "No notes match your search": "আপনার সার্চের সাথে কোনো নোট মেলেনি",
  "Nothing archived": "কিছু আর্কাইভ করা নেই",
  "No notes yet": "এখনও কোনো নোট নেই",
  "Try a different phrase.": "অন্য কিছু লিখে খুঁজুন।",
  "Archived notes will appear here.": "আর্কাইভ করা নোট এখানে দেখা যাবে।",
  "Write your first note to start building your knowledge base.":
    "নলেজ বেস তৈরি শুরু করতে আপনার প্রথম নোট লিখুন।",
  "Favorite": "প্রিয়",
  "Empty note": "খালি নোট",
  "Updated {date}": "আপডেট {date}",
  "Restore note": "নোট পুনরুদ্ধার",
  "Archive note": "নোট আর্কাইভ",
  "Edit note": "নোট সম্পাদনা",
  "Write in plain text — paragraphs are preserved when you save.":
    "সাধারণ টেক্সটে লিখুন — সংরক্ষণের সময় অনুচ্ছেদ সংরক্ষিত থাকে।",
  "Create note": "নোট তৈরি করুন",
  "Title": "শিরোনাম",
  "Body": "বিষয়বস্তু",
  "Start writing…": "লেখা শুরু করুন…",
  "Project ID": "প্রকল্প আইডি",
  "Optional — link this note to a project.": "ঐচ্ছিক — এই নোটটি একটি প্রকল্পের সাথে যুক্ত করুন।",
  "Parent note ID": "মূল নোট আইডি",
  "Optional — nest under another note.": "ঐচ্ছিক — অন্য নোটের অধীনে রাখুন।",
  "Mark as favorite": "প্রিয় হিসেবে চিহ্নিত করুন",
  "e.g. Meeting notes — website review": "যেমন: মিটিং নোট — ওয়েবসাইট পর্যালোচনা",
  "Delete note": "নোট মুছুন",

  // ---------------------------------------------------------------------------
  // Projects
  // ---------------------------------------------------------------------------
  "Group tasks, notes, events, and expenses under a single outcome.":
    "কাজ, নোট, ইভেন্ট ও খরচ একই লক্ষ্যের অধীনে সাজান।",
  "New project": "নতুন প্রকল্প",
  "No projects yet": "এখনও কোনো প্রকল্প নেই",
  "Could not load projects": "প্রকল্প লোড করা যায়নি",
  "Create your first project to give tasks a home.":
    "কাজগুলোকে জায়গা দিতে আপনার প্রথম প্রকল্প তৈরি করুন।",
  "No projects with this status": "এই অবস্থার কোনো প্রকল্প নেই",
  "Try another status filter.": "অন্য অবস্থা ফিল্টার চেষ্টা করুন।",
  "{count} project{s} shown": "{count}টি প্রকল্প দেখানো হচ্ছে",
  "{count} task{s} · {open} open": "{count}টি কাজ · {open}টি চলমান",
  "Due {date}": "শেষ সময় {date}",
  "Edit project": "প্রকল্প সম্পাদনা",
  "Give the work a name, status, and deadline.": "কাজটির একটি নাম, অবস্থা ও সময়সীমা দিন।",
  "Create project": "প্রকল্প তৈরি করুন",
  "Project name": "প্রকল্পের নাম",
  "Starts": "শুরু",
  "Accent color": "অ্যাকসেন্ট রঙ",
  "Optional hex value.": "ঐচ্ছিক হেক্স মান।",
  "Icon": "আইকন",
  "Optional icon name.": "ঐচ্ছিক আইকনের নাম।",
  "Optional summary and success criteria": "ঐচ্ছিক সারাংশ ও সফলতার মাপকাঠি",
  "Delete “{name}”? Linked records will be unassigned.":
    "“{name}” মুছবেন? যুক্ত রেকর্ডগুলো আনঅ্যাসাইন হয়ে যাবে।",
  "e.g. Website redesign": "যেমন: ওয়েবসাইট পুনঃডিজাইন",
  "Filter by status": "অবস্থা অনুযায়ী ফিল্টার",

  // ---------------------------------------------------------------------------
  // Files
  // ---------------------------------------------------------------------------
  "Stored documents and the records they are attached to.":
    "সংরক্ষিত ডকুমেন্ট এবং যে রেকর্ডের সাথে যুক্ত।",
  "Add file": "ফাইল যোগ করুন",
  "Total size": "মোট আকার",
  "Linked records": "যুক্ত রেকর্ড",
  "Types": "ধরন",
  "Library": "লাইব্রেরি",
  "{count} file{s}": "{count}টি ফাইল",
  "Search files…": "ফাইল খুঁজুন…",
  "Could not load files": "ফাইল লোড করা যায়নি",
  "No matching files": "মিলে যাওয়া ফাইল নেই",
  "No files yet": "এখনও কোনো ফাইল নেই",
  "Try a different name or type.": "অন্য নাম বা ধরন চেষ্টা করুন।",
  "Add a file record to keep related documents together.":
    "সংশ্লিষ্ট ডকুমেন্ট একসাথে রাখতে ফাইল রেকর্ড যোগ করুন।",
  "{count} link{s}": "{count}টি লিংক",
  "Edit file": "ফাইল সম্পাদনা",
  "New file record": "নতুন ফাইল রেকর্ড",
  "Register a stored file so it can be linked to tasks, notes, events, and expenses.":
    "সংরক্ষিত ফাইল নিবন্ধন করুন যাতে কাজ, নোট, ইভেন্ট ও খরচের সাথে যুক্ত করা যায়।",
  "Filename": "ফাইলের নাম",
  "MIME type": "MIME ধরন",
  "Byte size": "বাইট আকার",
  "Safe filename": "নিরাপদ ফাইলের নাম",
  "Sanitized name used on disk.": "ডিস্কে ব্যবহৃত পরিশোধিত নাম।",
  "Checksum": "চেকসাম",
  "Optional SHA-256.": "ঐচ্ছিক SHA-256।",
  "Storage path": "সংরক্ষণ পথ",
  "e.g. receipt.pdf": "যেমন: receipt.pdf",
  "Delete “{filename}”?": "“{filename}” মুছবেন?",
  "Delete file": "ফাইল মুছুন",

  // ---------------------------------------------------------------------------
  // Reminders
  // ---------------------------------------------------------------------------
  "Scheduled nudges delivered by the server — no tab needs to stay open.":
    "সার্ভার থেকে নির্ধারিত রিমাইন্ডার পাঠানো হয় — ট্যাব খোলা রাখতে হয় না।",
  "New reminder": "নতুন রিমাইন্ডার",
  "Total": "মোট",
  "Filter reminders by status": "অবস্থা অনুযায়ী রিমাইন্ডার ফিল্টার",
  "{count} shown": "{count}টি দেখানো হচ্ছে",
  "Due reminders are sent within a minute.":
    "নির্ধারিত রিমাইন্ডার এক মিনিটের মধ্যে পাঠানো হয়।",
  "Could not load reminders": "রিমাইন্ডার লোড করা যায়নি",
  "No reminders with this status": "এই অবস্থার কোনো রিমাইন্ডার নেই",
  "No reminders yet": "এখনও কোনো রিমাইন্ডার নেই",
  "Create a reminder so nothing important slips through.":
    "গুরুত্বপূর্ণ কিছু যাতে বাদ না পড়ে সে জন্য রিমাইন্ডার তৈরি করুন।",
  "Browser notification": "ব্রাউজার নোটিফিকেশন",
  "In-app": "অ্যাপের ভেতরে",
  "linked task": "যুক্ত কাজ",
  "linked event": "যুক্ত ইভেন্ট",
  "due now": "এখনই প্রয়োজন",
  "Edit reminder": "রিমাইন্ডার সম্পাদনা",
  "Times are shown in Asia/Dhaka and stored in UTC.":
    "সময় এশিয়া/ঢাকা অনুযায়ী দেখানো হয় এবং UTC-তে সংরক্ষিত হয়।",
  "Create reminder": "রিমাইন্ডার তৈরি করুন",
  "Message": "বার্তা",
  "Scheduled at": "নির্ধারিত সময়",
  "Channel": "চ্যানেল",
  "Browser": "ব্রাউজার",
  "e.g. Call the bank about the card": "যেমন: কার্ডের বিষয়ে ব্যাংকে কল করুন",
  "Delete this reminder?": "এই রিমাইন্ডারটি মুছবেন?",
  "Notifications active": "নোটিফিকেশন সক্রিয়",
  "Enable notifications": "নোটিফিকেশন চালু করুন",
  "Notifications enabled": "নোটিফিকেশন চালু হয়েছে",
  "Scheduled for {date}": "{date} এর জন্য নির্ধারিত",

  // ---------------------------------------------------------------------------
  // Reports
  // ---------------------------------------------------------------------------
  "See how actual spending compares with the plan for each category.":
    "প্রতিটি বিভাগের পরিকল্পনার সাথে প্রকৃত খরচ তুলনা করুন।",
  "Budgeted": "বাজেট নির্ধারিত",
  "Spent": "খরচ",
  "Income": "আয়",
  "Net this month": "এই মাসের নিট",
  "Income minus expenses": "আয় বাদ খরচ",
  "Category breakdown — {month}": "বিভাগভিত্তিক হিসাব — {month}",
  "{count} categor{y} with a budget": "বাজেটসহ {count}টি বিভাগ",
  "No budget data for this month": "এই মাসের কোনো বাজেট তথ্য নেই",
  "Add a budget category to compare planned versus actual spending.":
    "পরিকল্পিত ও প্রকৃত খরচ তুলনা করতে একটি বাজেট বিভাগ যোগ করুন।",
  "Over budget": "বাজেটের বেশি",
  "On track": "সঠিক পথে",
  "Over by {amount}": "{amount} বেশি",
  "Remaining {amount}": "বাকি {amount}",
  "{pct}% used · {left}% left": "{pct}% ব্যবহৃত · {left}% বাকি",
  "This month": "এই মাস",
  "Summary": "সারাংশ",
  "Budgeted vs spent": "বাজেট বনাম খরচ",
  "Income vs expenses": "আয় বনাম খরচ",

  // ---------------------------------------------------------------------------
  // Search page
  // ---------------------------------------------------------------------------
  "Find anything across tasks, events, expenses, notes, projects, and files.":
    "কাজ, ইভেন্ট, খরচ, নোট, প্রকল্প ও ফাইলের মধ্যে সবকিছু খুঁজুন।",
  "Search everything…": "সবকিছু খুঁজুন…",
  "Start typing to search": "খুঁজতে লেখা শুরু করুন",
  "Results update as you type and cover every module in the workspace.":
    "লেখার সাথে সাথে ফলাফল আপডেট হয় এবং ওয়ার্কস্পেসের প্রতিটি মডিউল কভার করে।",
  "No results for “{query}”": "“{query}” এর জন্য কোনো ফলাফল নেই",
  "Try a shorter phrase, a different spelling, or search for a category.":
    "ছোট বাক্যাংশ, ভিন্ন বানান বা বিভাগ লিখে খুঁজুন।",
  "{count} result{s} for": "{query} এর জন্য {count}টি ফলাফল",
  "Searching": "খোঁজা হচ্ছে",

  // ---------------------------------------------------------------------------
  // Quick add
  // ---------------------------------------------------------------------------
  "One entry point for tasks, events, and expenses.":
    "কাজ, ইভেন্ট ও খরচের জন্য একক প্রবেশপথ।",
  "Something to do": "করার মতো কিছু",
  "Something scheduled": "নির্ধারিত কিছু",
  "Money spent": "খরচ হয়েছে",
  "New entry": "নতুন এন্ট্রি",
  "Adding a {type}.": "{type} যোগ করা হচ্ছে।",
  "e.g. Review monthly spending": "যেমন: মাসিক খরচ পর্যালোচনা",
  "Ends": "শেষ",
  "Category ID from your budget setup.": "আপনার বাজেট সেটআপের বিভাগ আইডি।",
  "Create {type}": "{type} তৈরি করুন",
  "Created": "তৈরি হয়েছে",
  "Your {type} was saved successfully.": "আপনার {type} সফলভাবে সংরক্ষিত হয়েছে।",
  "How it works": "যেভাবে কাজ করে",
  "Shortcuts for daily capture.": "প্রতিদিনের এন্ট্রির শর্টকাট।",
  "Tasks land in today's work queue with the priority and due date you choose.":
    "কাজ আপনার বেছে নেওয়া অগ্রাধিকার ও শেষ সময়সহ আজকের কাজের তালিকায় যুক্ত হয়।",
  "Events appear on the calendar for the selected month and day.":
    "ইভেন্ট নির্বাচিত মাস ও দিনের ক্যালেন্ডারে দেখা যায়।",
  "Expenses update your monthly spending and budget reports immediately.":
    "খরচ আপনার মাসিক খরচ ও বাজেট রিপোর্ট সঙ্গে সঙ্গে আপডেট করে।",
  "Start and end are required": "শুরু ও শেষ আবশ্যক",
  "Amount is required": "পরিমাণ আবশ্যক",
  "Category is required": "বিভাগ আবশ্যক",
  "Date is required": "তারিখ আবশ্যক",
  "Unexpected error": "অপ্রত্যাশিত ত্রুটি",

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------
  System: "সিস্টেম",
  "Application key-value settings stored in PostgreSQL.":
    "PostgreSQL-এ সংরক্ষিত অ্যাপ্লিকেশনের কী-ভ্যালু সেটিংস।",
  "Add setting": "সেটিং যোগ করুন",
  "Keys are unique. Values may be JSON.": "কী অনন্য। মান JSON হতে পারে।",
  "Key": "কী",
  "Value": "মান",
  "Strings, numbers, or JSON are accepted.": "স্ট্রিং, সংখ্যা বা JSON গ্রহণযোগ্য।",
  "All settings": "সব সেটিংস",
  "{count} key{s}": "{count}টি কী",
  "No settings yet": "এখনও কোনো সেটিংস নেই",
  "Add your first key-value setting to configure the app.":
    "অ্যাপ কনফিগার করতে আপনার প্রথম কী-ভ্যালু সেটিং যোগ করুন।",
  "Updated": "আপডেট",
  "Delete {key}": "{key} মুছুন",
  "Delete the “{key}” setting?": "“{key}” সেটিংটি মুছবেন?",
  "Failed to load settings": "সেটিংস লোড করা যায়নি",
  "Failed to delete setting": "সেটিং মুছে ফেলা যায়নি",
  "Failed to add setting": "সেটিং যোগ করা যায়নি",
  "e.g. app_name": "যেমন: app_name",
};

/** Translate an English source string for the given locale. */
export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const template = locale === "bn" ? (BN[key] ?? key) : key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export { BN };
