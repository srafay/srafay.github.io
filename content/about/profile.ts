/*
  The About page's words and numbers. app/about/page.tsx draws them, so a change here needs no change there.
  Sources: the owner's CV, the owner's own words for the current role (25 October 2026), and GitHub's figures for the
  pinned repositories. The contribution calendar is in contributions.json, beside this file.
*/

/** A month, written as "2025-09". */
export type Month = `${number}-${number}`;

export type Role = {
  title: string;
  organisation: string;
  /** The name the introduction calls it by, for short lines such as the ruler's label. */
  shortName: string;
  started: Month;
  /** Left out while the role is current. */
  ended?: Month;
  /** Left out where the CV names no place. */
  place?: string;
  /** One line about the work, not a list of duties. */
  summary: string;
  /** What the role was built with, in the words the Languages and tools chips use where a chip names it. */
  skills: string[];
};

export type Degree = {
  title: string;
  school: string;
  startedYear: number;
  endedYear: number;
};

/** A repository as GitHub's pinned list shows it. */
export type Repository = {
  name: string;
  address: string;
  description: string;
  /** GitHub's main language for it, with GitHub's colour for that language. Left out where GitHub names none. */
  language?: { name: string; colour: string };
  stars: number;
  forks: number;
};

export type SkillGroup = { name: string; skills: string[] };

export const handle = "srafay";

/** The GitHub avatar, linked from GitHub rather than kept in the site. */
export const avatar = {
  address: "https://avatars.githubusercontent.com/u/16633972?v=4&s=240",
  pixels: 240,
};

export const bio =
  "I build cloud backends, AI tools and the screens in front of them.";

export const location = "Sydney, Australia";

/** The time zone of that place, for the time there now beside it. */
export const timeZone = "Australia/Sydney";

/** The opening lines, first person. */
export const introduction = [
  "Since August 2026 I have been a senior software engineer at Twin Technology. I work closely with the Chief AI & Intelligence Officer on .NET, Blazor and Azure, building the next generation of an AI platform.",
  "Before that I spent more than seven years on AWS serverless backends, applied AI and full-stack apps. Those years ran from Foree Pay in Karachi, through the Northern Land Council and AIMS in Darwin, to CommBank and Atelier in Sydney.",
];

/** From the GitHub profile's own README. */
export const personalNote =
  "Ask me about distributed systems, pragmatic infrastructure as code, cricket, or Python (the language, not the reptile). When I am not shipping code, you can find me in a Dota 2 lobby.";

/** The owner's own words for the role, 25 October 2026. */
export const currentRole = {
  title: "Senior Software Engineer",
  organisation: "Twin Technology Pty Ltd",
  started: "2026-08",
  description:
    "Working closely with the Chief AI & Intelligence Officer on .NET, Blazor and Azure, creating the next generation of an AI platform.",
} as const satisfies Pick<Role, "title" | "organisation" | "started"> & {
  description: string;
};

/*
  Newest first. Each role's skills are its stack as the CV gives it (the "Stack:" lines and the tools each role's
  points name), and for the current role the owner's own words (.NET, Blazor and Azure, with C#, which the page's "Now"
  group already names). A skill is listed only where the CV backs it.
*/
export const experience: Role[] = [
  {
    title: currentRole.title,
    organisation: currentRole.organisation,
    shortName: "Twin Technology",
    started: currentRole.started,
    summary:
      "The next generation of an AI platform, on .NET, Blazor and Azure.",
    skills: ["C#", ".NET", "Blazor", "Azure"],
  },
  {
    title: "Senior Software Engineer",
    organisation: "Atelier",
    shortName: "Atelier",
    started: "2025-09",
    ended: "2026-06",
    place: "Sydney",
    summary:
      "Serverless backends on AWS, and a multi-agent AI assistant built with LangChain and LangGraph.",
    skills: [
      "AWS Lambda",
      "AppSync",
      "Aurora",
      "DynamoDB",
      "OpenSearch",
      "SAM",
      "React",
      "Next.js",
      "TypeScript",
      "Python",
      "LangChain",
      "LangGraph",
      "RAG",
      "Agents",
      "Tool calling",
    ],
  },
  {
    title: "Senior Software Engineer",
    organisation: "Commonwealth Bank of Australia",
    shortName: "CommBank",
    started: "2025-06",
    ended: "2025-09",
    place: "Sydney",
    summary:
      "Full-stack tools that automate banking work, tested with Pytest, Vitest and Playwright.",
    skills: ["Python", "React", "Next.js"],
  },
  {
    title: "Senior Software Engineer",
    organisation: "Australian Institute of Marine Science",
    shortName: "AIMS",
    started: "2022-11",
    ended: "2025-05",
    place: "Remote and Darwin",
    summary:
      "ReefCloud and new science apps, with Python and Java APIs on AWS serverless.",
    skills: [
      "Python",
      "Java",
      "Angular",
      "Tailwind CSS",
      "CDK",
      "SAM",
      "AWS Lambda",
    ],
  },
  {
    title: "Software Developer",
    organisation: "Northern Land Council",
    shortName: "Northern Land Council",
    started: "2021-12",
    ended: "2022-11",
    place: "Darwin",
    summary:
      "Web apps and REST APIs in C# on .NET Core, with Blazor and SQL Server.",
    skills: ["C#", ".NET", "Blazor", "SQL Server", "React"],
  },
  {
    title: "Software Engineer",
    organisation: "Foree Pay",
    shortName: "Foree Pay",
    started: "2018-10",
    ended: "2020-02",
    place: "Karachi, Pakistan",
    summary:
      "Python payment APIs for web, Android and iOS apps, built to PCI-DSS.",
    skills: ["Python"],
  },
  {
    title: "Software Engineering Intern",
    organisation: "Media Research & Innovations",
    shortName: "Media Research & Innovations",
    started: "2018-02",
    ended: "2018-09",
    place: "Remote",
    summary:
      "The Android app and Flask APIs for a broadcast monitoring startup.",
    skills: ["Python", "Android"],
  },
];

/** Newest first, as the CV names them. */
export const education: Degree[] = [
  {
    title: "Masters of IT (Software Engineering)",
    school: "Charles Darwin University",
    startedYear: 2020,
    endedYear: 2021,
  },
  {
    title: "Bachelor of Engineering, Computer & Information Systems",
    school: "NED University of Engineering & Technology",
    startedYear: 2014,
    endedYear: 2018,
  },
];

/** The day the repositories' stars and forks were read from GitHub. */
export const repositoriesReadOn = "2026-10-25";

/*
  Six of the 44 public repositories: the two with the most stars, two of the CV's projects that people starred, this
  site, and the newest. GitHub's own pinned six on 25 October 2026 were Hadoop-hands-on, Machine_Learning_A-Z,
  Shinra-Tensei, SAMP-Server, aarh and AIC-Webpage.
*/
export const pinnedRepositories: Repository[] = [
  {
    name: "Machine_Learning_A-Z",
    address: "https://github.com/srafay/Machine_Learning_A-Z",
    description: "Learning to create Machine Learning Algorithms",
    language: { name: "Python", colour: "#3572A5" },
    stars: 399,
    forks: 197,
  },
  {
    name: "Hadoop-hands-on",
    address: "https://github.com/srafay/Hadoop-hands-on",
    description:
      "Learning how to tame the Big Data with Hadoop and related technologies",
    language: { name: "PigLatin", colour: "#fcd7de" },
    stars: 23,
    forks: 21,
  },
  {
    name: "Signature-Recognition",
    address: "https://github.com/srafay/Signature-Recognition",
    description:
      "Recognizing handwritten signatures of individuals accurately considering that they might be forged",
    language: { name: "Python", colour: "#3572A5" },
    stars: 5,
    forks: 0,
  },
  {
    name: "Time-Series-Analysis-JetRail",
    address: "https://github.com/srafay/Time-Series-Analysis-JetRail",
    description: "Time series model predicting monthly users and some analysis",
    language: { name: "Python", colour: "#3572A5" },
    stars: 3,
    forks: 8,
  },
  {
    name: "srafay.github.io",
    address: "https://github.com/srafay/srafay.github.io",
    // GitHub shows no description for this one.
    description: "The code behind this site.",
    language: { name: "HTML", colour: "#e34c26" },
    stars: 1,
    forks: 0,
  },
  {
    name: "windows-to-mac",
    address: "https://github.com/srafay/windows-to-mac",
    description:
      "Karabiner-Elements + VS Code/Cursor keybindings for Windows/PC-style shortcuts on macOS",
    stars: 0,
    forks: 0,
  },
];

/**
 * A few groups from the CV, not the whole list. A chip that some role in Experience lists among its skills answers
 * with those roles when pressed (lib/about/skills.ts). SQL is the one that does not. No role's stack names plain SQL
 * (the Northern Land Council's names SQL Server), so it stays a plain word.
 */
export const skillGroups: SkillGroup[] = [
  { name: "Now", skills: ["C#", ".NET", "Blazor", "Azure"] },
  {
    name: "Cloud",
    skills: [
      "AWS Lambda",
      "AppSync",
      "Aurora",
      "DynamoDB",
      "OpenSearch",
      "CDK",
      "SAM",
    ],
  },
  { name: "Languages", skills: ["Python", "TypeScript", "Java", "SQL"] },
  {
    name: "Front end",
    skills: ["React", "Next.js", "Angular", "Tailwind CSS"],
  },
  {
    name: "AI",
    skills: ["LangChain", "LangGraph", "RAG", "Agents", "Tool calling"],
  },
];

/** What each of the site's profiles (lib/site.ts) holds, by its label there. */
export const profilePurposes: Record<string, string> = {
  GitHub: "Code, this site included.",
  LinkedIn: "Work history.",
  "Stack Overflow": "Questions and answers.",
};

/** The public repositories the account had when the pinned six were read: GitHub's user API, public_repos, 25 October 2026. */
export const publicRepositoryCount = 44;

/** A city the roles took place in, as a point on the map, in degrees (south and west are negative). */
export type City = { name: string; latitude: number; longitude: number };

/*
  The three cities the introduction names, in the order the career reached them. Each is the city centre's coordinates
  as Wikipedia gives them (Karachi 24.8607 N 67.0011 E, Darwin 12.4637 S 130.8444 E, Sydney 33.8688 S 151.2093 E).
  Version 2 of the About page draws the career as a constellation with the cities at these places.
*/
export const cities: City[] = [
  { name: "Karachi", latitude: 24.8607, longitude: 67.0011 },
  { name: "Darwin", latitude: -12.4637, longitude: 130.8444 },
  { name: "Sydney", latitude: -33.8688, longitude: 151.2093 },
];

/*
  Everything below is the rest of the CV, for version 4 of the About page ("World lines", lib/world-lines/), which
  draws the whole of it. Source: the owner's CV, read on 28 October 2026, its words rewritten into the site's voice.
  The CV's phone number, email and summary paragraph are left out on purpose.
*/

/** A role from the CV's Internships section, which gives it no dates. */
export type UndatedRole = {
  title: string;
  organisation: string;
  shortName: string;
  /** The CV's lines for it, one sentence each. */
  lines: string[];
};

/** The CV's Internships section. */
export const internships: UndatedRole[] = [
  {
    title: "Research & Development Intern",
    organisation: "Love For Data",
    shortName: "Love For Data",
    lines: [
      "A one-month internship building a working image classifier with a state-of-the-art deep learning approach.",
      "Collected and cleaned the dataset, and reviewed research papers on classifying complex data.",
    ],
  },
  {
    title: "Research Student",
    organisation: "Research Centre for Artificial Intelligence (RCAI)",
    shortName: "RCAI",
    lines: [
      "Built real-time IoT software, programming Arduino and ZigBee devices.",
      "Learned Java for Android, and built and maintained the official website.",
    ],
  },
];

export type Project = {
  /** As the CV names it. */
  name: string;
  /** The label beside its point in the scene. */
  shortName: string;
  /** The CV's year, where it gives one. */
  year?: number;
  /** The CV's note in brackets beside the name, such as "Masters thesis" or "NED CIS Dept.". */
  context?: string;
  /** The CV's line for it, one sentence each. */
  lines: string[];
  /** The CV's GitHub link, where it gives one. */
  address?: string;
  /**
   * The year GitHub says the repository was made (GitHub's API, created_at, read 25 October 2026). Only for the
   * projects the CV leaves undated, where it is the one clue to when they were made.
   */
  repositoryYear?: number;
};

/** The CV's Projects section, in its order. */
export const projects: Project[] = [
  {
    name: "Enhancing Airport Screening Using CNN",
    shortName: "Airport screening thesis",
    year: 2021,
    context: "Masters thesis",
    lines: [
      "Transfer learning on MobileNetV2 and InceptionResNetV2 to find threats in X-ray images.",
      "Image augmentation with Keras ImageDataGenerator and class balancing, reaching 90 percent accuracy or better on the GDXRay dataset.",
    ],
  },
  {
    name: "E-commerce App (.NET Core + Angular)",
    shortName: "E-commerce app",
    year: 2021,
    lines: [
      "A 3-tier architecture (API, business and data) with scoped dependency injection, EF Core and Swagger docs.",
      "Logging with Exceptionless and Log4Net, Kendo UI on screen, and an Android build with Ionic and Cordova.",
    ],
    address: "https://github.com/srafay/PRT585-Group-B-Sem2-2021",
  },
  {
    name: "Signature Recognition",
    shortName: "Signature recognition",
    lines: [
      "Handwritten signature recognition with OpenCV computer vision and image recognition algorithms.",
    ],
    address: "https://github.com/srafay/Signature-Recognition",
    repositoryYear: 2018,
  },
  {
    name: "Image Recognition API",
    shortName: "Image Recognition API",
    year: 2018,
    lines: [
      "A TensorFlow machine learning API with Flask REST endpoints, deployed on AWS EC2 and Dockerized.",
    ],
    address: "https://github.com/srafay/Flask-App",
  },
  {
    name: "JetRail Time Series",
    shortName: "JetRail time series",
    year: 2018,
    lines: [
      "Monthly ridership forecasts with naive, windowing average, exponential smoothing, Holt's Trend, ARIMA and SARIMAX models.",
    ],
    address: "https://github.com/srafay/Time-Series-Analysis-JetRail",
  },
  {
    name: "Twitter Sentiment Analysis",
    shortName: "Twitter sentiment",
    year: 2018,
    lines: [
      "Text classification with NLTK and Keras, shown with Matplotlib and WordCloud.",
    ],
    address: "https://github.com/srafay/NLP-with-NLTK",
  },
  {
    name: "Scrapy the Scraper",
    shortName: "Scrapy the Scraper",
    lines: [
      "Web scraping for structured data extraction from sites without APIs, for insights, monitoring and machine learning pipelines (alternativeto.net).",
    ],
    address: "https://github.com/srafay/Scrapy-Web-Scraping",
    repositoryYear: 2018,
  },
  {
    name: "Media Icon",
    shortName: "Media Icon",
    lines: [
      "A complete broadcast-monitoring solution: an Android app and a Flask web app on AWS, with Python REST APIs.",
      "Livestreams processed with FFmpeg on threads.",
    ],
  },
  {
    name: "Deep Neural Image Classifier (YOLO v2 / DarkNet)",
    shortName: "YOLO image classifier",
    year: 2017,
    lines: [
      "A TensorFlow and DarkNet implementation, with 90 percent accuracy or better on a custom dataset.",
    ],
    address: "https://github.com/srafay/darkflow",
  },
  {
    name: "GTA:SA Multiplayer Server",
    shortName: "GTA:SA server",
    lines: ["Game server scripting in PAWN, a language like C."],
    address: "https://github.com/srafay/SAMP-Server",
    repositoryYear: 2016,
  },
  {
    name: "Online Voting System",
    shortName: "Online voting system",
    context: "NED CIS Dept.",
    lines: ["A web app in JavaScript, PHP and AJAX."],
    address: "https://github.com/srafay/aarh",
    repositoryYear: 2016,
  },
  {
    name: "IoT Weather Station & Climate Monitoring",
    shortName: "IoT weather station",
    year: 2016,
    context: "RCAI/NED",
    lines: [
      "IoT devices for real-time environment monitoring, viewable on the web.",
    ],
  },
  {
    name: "University Management System",
    shortName: "University management system",
    context: "NED CIS Dept.",
    lines: [
      "University records management with object-oriented programming in Visual C++ and Windows Forms.",
    ],
  },
  {
    name: "Report Generator (BB Code for Forums)",
    shortName: "BB code report generator",
    lines: [
      "A C# app that writes phpBB BB code, to help faction managers work out test marks.",
    ],
    address: "https://github.com/srafay/BB-Code-Generator-SWAT-",
    repositoryYear: 2016,
  },
  {
    name: "School Management System",
    shortName: "School management system",
    lines: ["Built with procedural programming."],
    address: "https://github.com/srafay/School-Management-System",
    repositoryYear: 2017,
  },
];

export type Course = {
  name: string;
  /** The label beside its stitch in the scene. */
  shortName: string;
  provider: string;
  started: Month;
  /** Left out where the CV gives a single month. */
  ended?: Month;
};

/** The CV's Courses & Certifications section, newest first as it lists them. */
export const courses: Course[] = [
  {
    name: "Model Context Protocols: Advanced Topics",
    shortName: "Model Context Protocol, advanced",
    provider: "Anthropic",
    started: "2026-06",
  },
  {
    name: "Introduction to Model Context Protocol",
    shortName: "Model Context Protocol",
    provider: "Anthropic",
    started: "2026-05",
  },
  {
    name: "Introduction to Agent Skills",
    shortName: "Agent Skills",
    provider: "Anthropic",
    started: "2026-05",
  },
  {
    name: "Introduction to Subagents",
    shortName: "Subagents",
    provider: "Anthropic",
    started: "2026-05",
  },
  {
    name: "An Introduction to OWASP Top 10 Vulnerabilities",
    shortName: "OWASP Top 10",
    provider: "Udemy",
    started: "2025-06",
    ended: "2025-09",
  },
  {
    name: "AWS Certified Solutions Architect Associate (SAA-C03) training",
    shortName: "AWS Solutions Architect",
    provider: "Udemy",
    started: "2025-03",
    ended: "2025-07",
  },
  {
    name: "ChatGPT Prompt Mastery",
    shortName: "ChatGPT Prompt Mastery",
    provider: "Udemy",
    started: "2025-04",
  },
  {
    name: "Rocking AWS Serverless: A Real World Guide",
    shortName: "Rocking AWS Serverless",
    provider: "Udemy",
    started: "2022-11",
    ended: "2022-12",
  },
  {
    name: "Build an E-commerce App with .NET Core and Angular",
    shortName: "E-commerce with .NET and Angular",
    provider: "Udemy",
    started: "2021-08",
    ended: "2021-10",
  },
  {
    name: "Python: Advanced Design Patterns",
    shortName: "Python design patterns",
    provider: "LinkedIn",
    started: "2018-11",
  },
  {
    name: "The Ultimate Hands-On Hadoop",
    shortName: "Hands-on Hadoop",
    provider: "Udemy",
    started: "2018-07",
    ended: "2018-09",
  },
  {
    name: "Python REST APIs with Flask, Docker, MongoDB, and AWS DevOps",
    shortName: "Flask REST APIs",
    provider: "Udemy",
    started: "2018-05",
    ended: "2018-06",
  },
  {
    name: "Intro to Python for Data Science",
    shortName: "Python for data science",
    provider: "DataCamp",
    started: "2018-03",
  },
  {
    name: "Machine Learning A-Z",
    shortName: "Machine Learning A-Z",
    provider: "Udemy",
    started: "2017-08",
    ended: "2017-09",
  },
  {
    name: "Android Development for Beginners",
    shortName: "Android for beginners",
    provider: "Google and Udacity",
    started: "2016-06",
    ended: "2016-08",
  },
];

export type Activity = {
  role: string;
  organisation: string;
  shortName: string;
  /** The CV's line for it, one sentence each. */
  lines: string[];
};

/** The CV's Extra-curricular Activities section, in its order. None of them is dated. */
export const activities: Activity[] = [
  {
    role: "Administrator and Developer",
    organisation: "ls-rcr.com, a GTA San Andreas multiplayer server",
    shortName: "GTA San Andreas server",
    lines: [
      "Managed the forums, reports, ban applications, in-game moderation, events and bug fixes.",
    ],
  },
  {
    role: "Core Member",
    organisation: "Artificial Intelligence Club, NEDUET",
    shortName: "AI club",
    lines: [
      "Raised awareness of AI, and ran machine learning training sessions and introductory Kaggle competitions.",
    ],
  },
  {
    role: "Head of Graphics",
    organisation: "Green Society",
    shortName: "Green Society graphics",
    lines: [
      "Led the graphics team for events, and served on the Executive Committee.",
    ],
  },
  {
    role: "Member of Graphics",
    organisation: "IEEE NED Computer Society",
    shortName: "IEEE graphics",
    lines: [
      "Created logos, membership cards and event posters, and learned Adobe Illustrator.",
    ],
  },
];

export type Pastime = { name: string; line: string };

/** What the GitHub profile's own README says the owner does off the clock (personalNote above), in the present tense. */
export const pastimes: Pastime[] = [
  { name: "Cricket", line: "Ask me about cricket." },
  {
    name: "Dota 2",
    line: "When I am not shipping code, you can find me in a Dota 2 lobby.",
  },
  { name: "Python", line: "Python, the language, not the reptile." },
];

/** A stretch of time a city was home. */
export type Stay = { city: string; from: Month; to?: Month };

/*
  When each city was home, from the roles' places. Karachi runs from NED (2014) to the end of Foree Pay (February
  2020). Darwin runs from then to the end of AIMS (May 2025, "Remote/Darwin"). Sydney runs from CommBank (June 2025).
*/
export const stays: Stay[] = [
  { city: "Karachi", from: "2014-01", to: "2020-02" },
  { city: "Darwin", from: "2020-02", to: "2025-05" },
  { city: "Sydney", from: "2025-06" },
];

/**
 * A skill as the CV writes it. Some of the CV's items hold more than one skill ("Python (Flask, Django, FastAPI)") or
 * a gloss in brackets ("CloudFormation (IaC)"). For those, words names the skills the page draws, one each.
 */
export type CvSkill = string | { asWritten: string; words: string[] };

export type CvSkillGroup = { name: string; skills: CvSkill[] };

/** The CV's Skills section, every group and every item in its order. */
export const cvSkillGroups: CvSkillGroup[] = [
  {
    name: "Front-end",
    skills: [
      "HTML",
      "CSS",
      "JavaScript",
      "TypeScript",
      "Angular",
      "React",
      "Next.js",
      "Aurelia",
      "jQuery",
      "Ionic",
      "Cordova",
      "Bootstrap",
      "Tailwind",
      "Angular Material",
      "Material UI",
      "Kendo UI",
      "Java (Android)",
      "Windows Forms",
      "Blazor",
      "Razor",
      "Syncfusion",
      "Highcharts",
      "Retool",
      "Shadcn",
    ],
  },
  {
    name: "Back-end",
    skills: [
      "C++",
      {
        asWritten: "Python (Flask, Django, FastAPI)",
        words: ["Python", "Flask", "Django", "FastAPI"],
      },
      {
        asWritten: "Java (Spring Boot, Quarkus)",
        words: ["Java", "Spring Boot", "Quarkus"],
      },
      "PHP",
      "C#",
      "ASP.NET Core Web API",
      "Node.js",
      "Go",
      "Verilog",
      "Pawn",
    ],
  },
  {
    name: "AWS",
    skills: [
      "EC2",
      "ECS",
      "RDS",
      "Aurora",
      "S3",
      "CDK",
      "SAM",
      "API Gateway",
      "Lambda",
      "Lambda@Edge",
      "Boto3",
      "AWS CLI",
      "Cognito",
      "Amplify",
      "Secrets Manager",
      "SSM Parameter Store",
      { asWritten: "CloudFormation (IaC)", words: ["CloudFormation"] },
      "EFS",
      "SQS",
      "SNS",
      "SES",
      "Verified Permissions",
      "OpenSearch",
      { asWritten: "AppSync (GraphQL)", words: ["AppSync"] },
      "DynamoDB",
      "Deadline Cloud",
      "AWS Batch",
      "Fargate",
    ],
  },
  {
    name: "GenAI and LLM engineering",
    skills: [
      "LangChain",
      "LangGraph",
      "multi-agent orchestration",
      "tool/function calling",
      { asWritten: "RAG (vector + retrieval)", words: ["RAG"] },
      {
        asWritten: "vector embeddings and semantic search (AWS OpenSearch)",
        words: ["vector embeddings and semantic search"],
      },
      {
        asWritten: "Perplexity Sonar (deep research)",
        words: ["Perplexity Sonar"],
      },
      "prompt engineering",
      "structured data extraction",
      "web-search agents",
      {
        asWritten: "LLM observability and evals (Langfuse)",
        words: ["LLM observability and evals", "Langfuse"],
      },
      {
        asWritten:
          "media generation (Veo 3.0/3.1, Seedance 2.0, ChatGPT Image 2.0)",
        words: ["media generation", "Veo", "Seedance", "ChatGPT Image"],
      },
    ],
  },
  {
    name: "AI coding tools, frameworks and services",
    skills: [
      "GitHub Copilot",
      "Cline",
      "RooCode",
      "KiloCode",
      "OpenClaw",
      "Claude CLI/Cowork",
      "Codex",
      "OpenAI",
      "Claude",
      { asWritten: "Perplexity (Sonar)", words: ["Perplexity Sonar"] },
      "OpenRouter",
      {
        asWritten: "Gemini Enterprise Agent Platform (Vertex AI)",
        words: ["Gemini Enterprise Agent Platform"],
      },
      {
        asWritten: "Spec-Driven Development (SDD)",
        words: ["Spec-Driven Development"],
      },
      "GitHub Spec-Kit",
      "Agent OS",
    ],
  },
  {
    name: "Databases and DBMS",
    skills: [
      "SQL",
      "MySQL",
      "MSSQL",
      "SQLite",
      "MongoDB",
      "Redis",
      "RedisInsight v2",
      "Robo3T",
      "MSSQL Server Management Studio",
      "PostgreSQL",
      "pgAdmin",
      "DataGrip",
      "DBeaver",
      "SQL Developer",
      "Oracle",
    ],
  },
  {
    name: "IDEs, editors and GUIs",
    skills: [
      "Visual Studio",
      "VS Code",
      "PyCharm",
      "IntelliJ IDEA",
      "Vim",
      "Nano",
      "Notepad++",
      "Android Studio",
      "Atom",
      "Anaconda",
      "Spyder",
      "Burp Suite",
      "Postman",
    ],
  },
  {
    name: "Version control",
    skills: [
      "Git",
      "Git Bash",
      "GitHub",
      "GitHub Desktop",
      "Bitbucket",
      "GitLab",
      "SourceTree",
    ],
  },
  {
    name: "Project management and communication",
    skills: [
      "Confluence",
      "Jira",
      "Trello",
      "MS Teams",
      "Slack",
      "Azure DevOps",
      "Linear",
      "Miro",
      "Outline",
      "Wrike",
    ],
  },
  {
    name: "Machine learning frameworks and models",
    skills: [
      "TensorFlow",
      "Keras",
      "YOLO",
      "XGBoost",
      "MobileNet",
      "Inception",
      "Inception-ResNet",
      "Comet.ml",
      "SpaCy NLP",
      "Time Series forecasting and analysis",
      "Sentiment analysis",
    ],
  },
  {
    name: "Cloud and online services",
    skills: [
      "Twilio",
      "ThingSpeak",
      "Microsoft Azure AD SSO",
      "Okta SSO",
      "KeyCloak SSO",
      "Microsoft Graph API",
      {
        asWritten: "Google Cloud Messaging (GCM)",
        words: ["Google Cloud Messaging"],
      },
      {
        asWritten: "Firebase Cloud Messaging (FCM)",
        words: ["Firebase Cloud Messaging"],
      },
      "GitHub OIDC",
      "Apify",
    ],
  },
  {
    name: "Operating systems and containers",
    skills: [
      "Ubuntu",
      "Debian",
      "Windows Server",
      "WSL/WSL2",
      "Docker",
      "Docker Compose",
    ],
  },
  {
    name: "Loggers and ORMs",
    skills: [
      "Entity Framework Core",
      "SQLAlchemy",
      "Alembic",
      "Exceptionless",
      "Log4Net",
      "NLog",
      "Log4j",
      "Hibernate",
    ],
  },
  {
    name: "Design patterns",
    skills: [
      "Dependency Injection",
      {
        asWritten: "3-tier architecture (Presentation/Logic/Data)",
        words: ["3-tier architecture"],
      },
      "MVC",
      {
        asWritten: "GoF patterns (Singleton, Factory)",
        words: ["GoF patterns"],
      },
      {
        asWritten: "Feature-Sliced Design (FSD)",
        words: ["Feature-Sliced Design"],
      },
    ],
  },
  {
    name: "Testing",
    skills: [
      "Pytest",
      "Vitest",
      "NUnit",
      "Playwright",
      "React Testing Library",
      "JUnit",
    ],
  },
  {
    name: "Security and DevSecOps",
    skills: [
      "OWASP Top 10 awareness",
      "PCI-DSS-compliant API development",
      {
        asWritten: "CI/CD pipeline security (GitHub Actions, Bitbucket)",
        words: ["CI/CD pipeline security", "GitHub Actions", "Bitbucket"],
      },
      { asWritten: "GitHub OIDC keyless auth", words: ["GitHub OIDC"] },
      "AWS IAM least-privilege",
      "Secrets Manager",
      "SSM Parameter Store",
      {
        asWritten: "AWS Verified Permissions (fine-grained authz)",
        words: ["Verified Permissions"],
      },
      {
        asWritten:
          "dependency management and patching (runtime/framework version upgrades, vulnerability remediation)",
        words: ["dependency management and patching"],
      },
      {
        asWritten: "SSO/identity (Azure AD, Okta, KeyCloak)",
        words: ["Microsoft Azure AD SSO", "Okta SSO", "KeyCloak SSO"],
      },
      "Burp Suite",
    ],
  },
  {
    name: "Packages and frameworks",
    skills: [
      { asWritten: "Celery (Python async task queue)", words: ["Celery"] },
      "uWSGI",
      "Alembic",
      "Atlassian Connect",
      "Scrapy",
      {
        asWritten: "Powertools for AWS Lambda (Python)",
        words: ["Powertools for AWS Lambda"],
      },
    ],
  },
  {
    name: "Others",
    skills: [
      "Bamboo",
      "ReSharper",
      { asWritten: "SwaggerUI (OpenAPI)", words: ["SwaggerUI"] },
      "Swashbuckle",
      "Redis Sentinel",
      "Arduino",
      "Raspberry Pi",
      "EndNote",
      "Crontab",
      "Bash scripting",
    ],
  },
];

/**
 * Two skills the owner's own words for the current role name (currentRole above: ".NET, Blazor and Azure") that the
 * CV's Skills section does not list. Version 4 floats them with the rest.
 */
export const currentRoleSkills: string[] = [".NET", "Azure"];

/*
  The skills each event's own CV lines name, in the words cvSkillGroups draws. A skill is listed only where the event's
  line names it ("Python REST APIs (Flask)" names Python and Flask). Keyed by the event's shortName. The current role's
  come from the owner's words, since the CV predates it. Events whose lines name no listed skill are left out.
*/
export const skillsNamedBy: Record<string, string[]> = {
  // Roles: the CV's Experience section, and the owner's words for Twin Technology.
  "Twin Technology": [".NET", "Blazor", "Azure"],
  Atelier: [
    "SAM",
    "CloudFormation",
    "Lambda",
    "AppSync",
    "Aurora",
    "S3",
    "DynamoDB",
    "Verified Permissions",
    "React",
    "Next.js",
    "OpenAI",
    "LangChain",
    "LangGraph",
    "multi-agent orchestration",
    "tool/function calling",
    "TypeScript",
    "Node.js",
    "Python",
    "Perplexity Sonar",
    "web-search agents",
    "RAG",
    "OpenSearch",
    "vector embeddings and semantic search",
    "structured data extraction",
    "media generation",
    "Veo",
    "Seedance",
    "GitHub Actions",
    "dependency management and patching",
  ],
  CommBank: [
    "Pytest",
    "Vitest",
    "Playwright",
    "Python",
    "React",
    "Next.js",
    "Material UI",
  ],
  AIMS: [
    "Python",
    "FastAPI",
    "SQLAlchemy",
    "Java",
    "Spring Boot",
    "Quarkus",
    "Angular",
    "Angular Material",
    "Tailwind",
    "CDK",
    "SAM",
    "CloudFormation",
    "AWS IAM least-privilege",
    "Secrets Manager",
    "Lambda",
    "API Gateway",
    "RDS",
    "PostgreSQL",
    "Bitbucket",
    "GitHub",
    "GitHub OIDC",
    "CI/CD pipeline security",
    "dependency management and patching",
  ],
  "Northern Land Council": [
    ".NET",
    "SwaggerUI",
    "C#",
    "ASP.NET Core Web API",
    "Entity Framework Core",
    "Blazor",
    "Syncfusion",
    "Razor",
    "React",
    "MSSQL",
    "Docker",
    "Redis",
    "RDS",
    "EC2",
    "Git",
    "Bitbucket",
    "Jira",
    "Confluence",
  ],
  "Foree Pay": [
    "Python",
    "PCI-DSS-compliant API development",
    "Node.js",
    "Redis",
    "Go",
  ],
  "Media Research & Innovations": [
    "Java (Android)",
    "Python",
    "Flask",
    "Slack",
    "Jira",
  ],
  // Internships.
  RCAI: ["Arduino", "Java (Android)"],
  // Projects.
  "Airport screening thesis": ["MobileNet", "Inception-ResNet", "Keras"],
  "E-commerce app": [
    ".NET",
    "Angular",
    "3-tier architecture",
    "Dependency Injection",
    "Entity Framework Core",
    "SwaggerUI",
    "Exceptionless",
    "Log4Net",
    "Kendo UI",
    "Ionic",
    "Cordova",
  ],
  "Image Recognition API": ["TensorFlow", "Flask", "EC2", "Docker"],
  "JetRail time series": ["Time Series forecasting and analysis"],
  "Twitter sentiment": ["Keras", "Sentiment analysis"],
  "Scrapy the Scraper": ["Scrapy", "structured data extraction"],
  "Media Icon": ["Java (Android)", "Flask", "Python"],
  "YOLO image classifier": ["YOLO", "TensorFlow"],
  "GTA:SA server": ["Pawn"],
  "Online voting system": ["JavaScript", "PHP"],
  "University management system": ["C++", "Windows Forms"],
  "BB code report generator": ["C#"],
  // Courses.
  "OWASP Top 10": ["OWASP Top 10 awareness"],
  "ChatGPT Prompt Mastery": ["prompt engineering"],
  "E-commerce with .NET and Angular": [".NET", "Angular"],
  "Python design patterns": ["Python"],
  "Flask REST APIs": ["Python", "Flask", "Docker", "MongoDB"],
  "Python for data science": ["Python"],
  "Android for beginners": ["Java (Android)"],
};
