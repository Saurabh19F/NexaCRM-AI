package com.nexacrm.config;

import com.nexacrm.model.*;
import com.nexacrm.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements ApplicationRunner {

    private final LeadRepository         leadRepository;
    private final DealRepository         dealRepository;
    private final CustomerRepository     customerRepository;
    private final InvoiceRepository      invoiceRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository         userRepository;
    private final PasswordEncoder        passwordEncoder;

    private static final Long TENANT = 1L;

    @Override
    public void run(ApplicationArguments args) {
        if (leadRepository.count() > 0) {
            log.info("Demo data already present — skipping seeder.");
            return;
        }
        log.info("Seeding demo data into MongoDB Atlas…");

        User priya = ensureUser("Priya Singh",  "priya@nexacrm.com",  "Priya@123",  User.Role.MANAGER);
        User rahul = ensureUser("Rahul Mehta",  "rahul@nexacrm.com",  "Rahul@123",  User.Role.SALES_EXEC);
        User amit  = ensureUser("Amit Kapoor",  "amit@nexacrm.com",   "Amit@123",   User.Role.SALES_EXEC);

        User admin = userRepository.findAll().stream()
            .filter(u -> u.getRole() == User.Role.ADMIN)
            .findFirst().orElse(priya);

        List<Lead>     leads     = seedLeads(priya, rahul, amit);
        List<Customer> customers = seedCustomers(priya, rahul, amit);
        seedDeals(leads, priya, rahul, amit);
        seedInvoices(customers);
        seedNotifications(admin);

        log.info("Demo data seeded: {} leads, {} customers.", leads.size(), customers.size());
    }

    // ── Users ──────────────────────────────────────────────────────

    private User ensureUser(String name, String email, String rawPassword, User.Role role) {
        return userRepository.findByEmailAndDeletedFalse(email).orElseGet(() -> {
            User u = User.builder()
                .name(name).email(email)
                .password(passwordEncoder.encode(rawPassword))
                .role(role).isActive(true).twoFaEnabled(false)
                .build();
            u.setTenantId(TENANT);
            u.setDeleted(false);
            return userRepository.save(u);
        });
    }

    // ── Leads ──────────────────────────────────────────────────────

    private List<Lead> seedLeads(User priya, User rahul, User amit) {
        LocalDateTime now = LocalDateTime.now();
        List<Lead> leads = List.of(
            lead("Ramesh Patel",      "ramesh@techcorp.in",       "+91-98765-43210", "Tech Corp",
                 Lead.LeadSource.FACEBOOK,    Lead.LeadStatus.NEW,         Lead.LeadScore.HOT,  Lead.LeadPriority.HIGH,
                 new BigDecimal("125000"), priya, 82, "Call immediately — high win probability",
                 "enterprise,priority", "Interested in Enterprise plan. Needs demo this week.",
                 now.minusDays(1)),

            lead("Arjun Sharma",      "arjun@globalsoft.com",     "+91-87654-32109", "GlobalSoft",
                 Lead.LeadSource.LINKEDIN,    Lead.LeadStatus.CONTACTED,   Lead.LeadScore.WARM, Lead.LeadPriority.MEDIUM,
                 new BigDecimal("85000"),  rahul, 58, "Send personalized follow-up within 24 hours",
                 "smb", "Spoke on call. Evaluating 3 vendors. Follow up Friday.",
                 now.minusDays(3)),

            lead("Divya Nair",        "divya@infosys.com",        "+91-76543-21098", "InfoSys Ltd.",
                 Lead.LeadSource.WEBSITE,     Lead.LeadStatus.QUALIFIED,   Lead.LeadScore.HOT,  Lead.LeadPriority.HIGH,
                 new BigDecimal("250000"), priya, 88, "Call immediately — high win probability",
                 "enterprise,priority", "Qualified via inbound demo request. Decision maker confirmed.",
                 now.minusDays(2)),

            lead("Kiran Mehta",       "kiran@startup.io",         "+91-65432-10987", "StartUp.io",
                 Lead.LeadSource.INSTAGRAM,   Lead.LeadStatus.NEW,         Lead.LeadScore.COLD, Lead.LeadPriority.LOW,
                 new BigDecimal("35000"),  amit, 28, "Nurture with educational content",
                 "startup", "Came from Instagram ad. Early stage, small team.",
                 now.minusDays(5)),

            lead("Sunita Rao",        "sunita@wipro.com",         "+91-54321-09876", "Wipro",
                 Lead.LeadSource.WHATSAPP,    Lead.LeadStatus.PROPOSAL,    Lead.LeadScore.WARM, Lead.LeadPriority.HIGH,
                 new BigDecimal("420000"), rahul, 65, "Send personalized follow-up within 24 hours",
                 "enterprise", "Proposal sent 3 days ago. Awaiting procurement approval.",
                 now.minusDays(7)),

            lead("Vijay Kumar",       "vijay@hcltech.com",        "+91-43210-98765", "HCL Tech",
                 Lead.LeadSource.LINKEDIN,    Lead.LeadStatus.NEGOTIATION, Lead.LeadScore.HOT,  Lead.LeadPriority.HIGH,
                 new BigDecimal("580000"), priya, 91, "Call immediately — high win probability",
                 "enterprise,priority", "In final negotiation. Needs SLA agreement review.",
                 now.minusDays(10)),

            lead("Meera Krishnan",    "meera@freshworks.com",     "+91-32109-87654", "Freshworks",
                 Lead.LeadSource.FACEBOOK,    Lead.LeadStatus.CONTACTED,   Lead.LeadScore.WARM, Lead.LeadPriority.MEDIUM,
                 new BigDecimal("145000"), amit, 52, "Send personalized follow-up within 24 hours",
                 "saas", "Interested in integration features. Setup tech demo.",
                 now.minusDays(4)),

            lead("Rajesh Singh",      "rajesh@mindtree.com",      "+91-21098-76543", "Mindtree",
                 Lead.LeadSource.REFERRAL,    Lead.LeadStatus.WON,         Lead.LeadScore.HOT,  Lead.LeadPriority.HIGH,
                 new BigDecimal("320000"), priya, 95, "Onboard — deal closed!",
                 "enterprise", "Deal won. Contract signed. Onboarding scheduled.",
                 now.minusDays(15)),

            lead("Ananya Iyer",       "ananya@zoho.com",          "+91-91234-56789", "Zoho Corp",
                 Lead.LeadSource.GOOGLE_ADS,  Lead.LeadStatus.QUALIFIED,   Lead.LeadScore.HOT,  Lead.LeadPriority.HIGH,
                 new BigDecimal("195000"), rahul, 79, "Call immediately — high win probability",
                 "saas,priority", "Reached out post Google Ads click. Very engaged.",
                 now.minusDays(1)),

            lead("Sandeep Gupta",     "sandeep@bajajfinserv.com", "+91-80987-65432", "Bajaj Finserv",
                 Lead.LeadSource.EMAIL,       Lead.LeadStatus.CONTACTED,   Lead.LeadScore.WARM, Lead.LeadPriority.MEDIUM,
                 new BigDecimal("310000"), amit, 61, "Send personalized follow-up within 24 hours",
                 "fintech,enterprise", "BFSI vertical. Needs compliance docs.",
                 now.minusDays(6)),

            lead("Pooja Desai",       "pooja@tataconsultancy.com","+91-70123-45678", "TCS",
                 Lead.LeadSource.LINKEDIN,    Lead.LeadStatus.NEW,         Lead.LeadScore.WARM, Lead.LeadPriority.MEDIUM,
                 new BigDecimal("440000"), priya, 55, "Send personalized follow-up within 24 hours",
                 "enterprise", "LinkedIn connection. VP of Sales. High potential.",
                 now.minusDays(1)),

            lead("Rohit Agarwal",     "rohit@nykaa.com",          "+91-60987-12345", "Nykaa",
                 Lead.LeadSource.META_ADS,    Lead.LeadStatus.LOST,        Lead.LeadScore.COLD, Lead.LeadPriority.LOW,
                 new BigDecimal("75000"),  rahul, 20, "Nurture with educational content",
                 "ecommerce", "Went with competitor. Keep in nurture sequence.",
                 now.minusDays(20))
        );
        return leadRepository.saveAll(leads);
    }

    private Lead lead(String name, String email, String phone, String company,
                      Lead.LeadSource src, Lead.LeadStatus status, Lead.LeadScore score,
                      Lead.LeadPriority priority, BigDecimal value,
                      User assignee, int aiScore, String aiAction,
                      String tags, String notes, LocalDateTime created) {
        Lead l = new Lead();
        l.setTenantId(TENANT); l.setDeleted(false);
        l.setName(name); l.setEmail(email); l.setPhone(phone); l.setCompany(company);
        l.setSource(src); l.setStatus(status); l.setScore(score); l.setPriority(priority);
        l.setDealValue(value);
        l.setAssignedTo(assignee);
        l.setAiScoreValue(aiScore); l.setAiNextAction(aiAction);
        l.setTags(tags); l.setNotes(notes);
        l.setCreatedAt(created); l.setUpdatedAt(created);
        l.setLastContactedAt(created.plusHours(2));
        return l;
    }

    // ── Customers ──────────────────────────────────────────────────

    private List<Customer> seedCustomers(User priya, User rahul, User amit) {
        List<Customer> customers = List.of(
            customer("Mindtree Ltd.",         "accounts@mindtree.com",      "+91-80-4964-4000",
                     "Mindtree", "IT Services", "https://mindtree.com",
                     "Rajesh Singh",  priya, 92, Customer.CustomerStatus.ACTIVE,
                     "29AABCM1234P1Z5", "Enterprise CRM — won deal, fully onboarded."),

            customer("Wipro Technologies",    "billing@wipro.com",          "+91-80-2844-0011",
                     "Wipro", "IT Services", "https://wipro.com",
                     "Sunita Rao",    rahul, 74, Customer.CustomerStatus.ACTIVE,
                     "27AABCW0123Q1Z3", "Annual contract renewed. Good engagement."),

            customer("HCL Technologies",      "hcl-billing@hcltech.com",    "+91-120-6125000",
                     "HCL Tech", "IT Services", "https://hcltech.com",
                     "Vijay Kumar",   priya, 88, Customer.CustomerStatus.ACTIVE,
                     "09AABCH5678R1ZX", "New customer — contract signed last month."),

            customer("Bajaj Finserv",         "vendor@bajajfinserv.com",    "+91-20-3040-5060",
                     "Bajaj Finserv", "BFSI", "https://bajajfinserv.com",
                     "Sandeep Gupta", amit, 61, Customer.CustomerStatus.AT_RISK,
                     "27AABCB4321S1Z9", "Renewal coming up. Usage dropped 30% last quarter."),

            customer("Freshworks Inc.",       "accounts@freshworks.com",    "+91-44-6111-6111",
                     "Freshworks", "SaaS", "https://freshworks.com",
                     "Meera Krishnan", rahul, 79, Customer.CustomerStatus.ACTIVE,
                     "33AABCF9876T1Z2", "Growing account. Added 2 new modules."),

            customer("Zoho Corporation",      "billing@zoho.com",           "+91-44-6730-4800",
                     "Zoho Corp", "SaaS", "https://zoho.com",
                     "Ananya Iyer",   priya, 85, Customer.CustomerStatus.ACTIVE,
                     "33AABCZ1122U1Z7", "Champion user. Upsell opportunity identified.")
        );
        return customerRepository.saveAll(customers);
    }

    private Customer customer(String name, String email, String phone,
                              String company, String industry, String website,
                              String primaryContact, User am,
                              int health, Customer.CustomerStatus status,
                              String gstin, String notes) {
        Customer c = new Customer();
        c.setTenantId(TENANT); c.setDeleted(false);
        c.setName(name); c.setEmail(email); c.setPhone(phone);
        c.setCompany(company); c.setIndustry(industry); c.setWebsite(website);
        c.setPrimaryContact(primaryContact);
        c.setAccountManager(am);
        c.setHealthScore(health); c.setStatus(status);
        c.setGstin(gstin); c.setNotes(notes);
        c.setCreatedAt(LocalDateTime.now().minusDays(30));
        c.setUpdatedAt(LocalDateTime.now().minusDays(2));
        return c;
    }

    // ── Deals ──────────────────────────────────────────────────────

    private void seedDeals(List<Lead> leads, User priya, User rahul, User amit) {
        LocalDate today = LocalDate.now();
        dealRepository.saveAll(List.of(
            deal("Tech Corp CRM Suite",       leads, "Tech Corp",    Deal.DealStage.NEW,
                 new BigDecimal("125000"), today.plusDays(30),  60, priya,  "hot",   "Initial discovery done."),
            deal("StartUp.io Starter Pack",   leads, "StartUp.io",   Deal.DealStage.CONTACTED,
                 new BigDecimal("35000"),  today.plusDays(25),  35, amit,   "cold",  "Intro call scheduled."),
            deal("GlobalSoft CRM",            leads, "GlobalSoft",   Deal.DealStage.CONTACTED,
                 new BigDecimal("85000"),  today.plusDays(20),  45, rahul,  "warm",  "Follow-up email sent."),
            deal("Freshworks Integration",    leads, "Freshworks",   Deal.DealStage.QUALIFIED,
                 new BigDecimal("145000"), today.plusDays(18),  55, amit,   "warm",  "Requirements documented."),
            deal("InfoSys Enterprise",        leads, "InfoSys Ltd.", Deal.DealStage.QUALIFIED,
                 new BigDecimal("250000"), today.plusDays(15),  70, priya,  "hot",   "POC approved."),
            deal("Wipro Cloud Suite",         leads, "Wipro",        Deal.DealStage.PROPOSAL,
                 new BigDecimal("420000"), today.plusDays(10),  65, rahul,  "warm",  "Proposal under review."),
            deal("Mindtree Platform",         leads, "Mindtree",     Deal.DealStage.PROPOSAL,
                 new BigDecimal("320000"), today.plusDays(8),   72, priya,  "hot",   "Awaiting legal sign-off."),
            deal("HCL Tech Package",          leads, "HCL Tech",     Deal.DealStage.NEGOTIATION,
                 new BigDecimal("580000"), today.plusDays(5),   89, priya,  "hot",   "Final pricing negotiation."),
            deal("Zoho CRM Migration",        leads, "Zoho Corp",    Deal.DealStage.NEGOTIATION,
                 new BigDecimal("195000"), today.plusDays(6),   78, rahul,  "hot",   "SLA terms being finalised."),
            deal("Bajaj Finserv Analytics",   leads, "Bajaj Finserv",Deal.DealStage.WON,
                 new BigDecimal("310000"), today.minusDays(2),  100, amit,  "hot",   "Contract signed!"),
            deal("Nykaa MarTech",             leads, "Nykaa",        Deal.DealStage.LOST,
                 new BigDecimal("75000"),  today.minusDays(10), 0,  rahul,  "cold",  "Went with Salesforce.")
        ));
    }

    private Deal deal(String title, List<Lead> leads, String company,
                      Deal.DealStage stage, BigDecimal value,
                      LocalDate closeDate, int prob, User owner,
                      String aiScore, String notes) {
        Lead lead = leads.stream()
            .filter(l -> l.getCompany() != null && l.getCompany().equalsIgnoreCase(company))
            .findFirst().orElse(leads.get(0));

        Deal d = new Deal();
        d.setTenantId(TENANT); d.setDeleted(false);
        d.setTitle(title);
        d.setLead(lead);
        d.setStage(stage); d.setDealValue(value);
        d.setExpectedCloseDate(closeDate);
        d.setWinProbability(prob);
        d.setOwner(owner);
        d.setAiScore(aiScore); d.setNotes(notes);
        d.setPriority(value.compareTo(new BigDecimal("200000")) >= 0
            ? Deal.DealPriority.HIGH : Deal.DealPriority.MEDIUM);
        d.setCreatedAt(LocalDateTime.now().minusDays(15));
        d.setUpdatedAt(LocalDateTime.now().minusDays(1));
        return d;
    }

    // ── Invoices ───────────────────────────────────────────────────

    private void seedInvoices(List<Customer> customers) {
        LocalDate today = LocalDate.now();
        int[] inv = {1};

        List<Object[]> rows = List.of(
            new Object[]{ customers.get(0), new BigDecimal("271186"), Invoice.InvoiceStatus.PAID,    today.minusDays(30), today.minusDays(16), today.minusDays(10) },
            new Object[]{ customers.get(1), new BigDecimal("355932"), Invoice.InvoiceStatus.PAID,    today.minusDays(25), today.minusDays(11), today.minusDays(5)  },
            new Object[]{ customers.get(2), new BigDecimal("491525"), Invoice.InvoiceStatus.PENDING, today.minusDays(10), today.plusDays(5),   null               },
            new Object[]{ customers.get(3), new BigDecimal("262712"), Invoice.InvoiceStatus.OVERDUE, today.minusDays(35), today.minusDays(5),  null               },
            new Object[]{ customers.get(4), new BigDecimal("122881"), Invoice.InvoiceStatus.SENT,    today.minusDays(5),  today.plusDays(10),  null               },
            new Object[]{ customers.get(5), new BigDecimal("165254"), Invoice.InvoiceStatus.DRAFT,   today,               today.plusDays(15),  null               },
            new Object[]{ customers.get(0), new BigDecimal("338983"), Invoice.InvoiceStatus.PAID,    today.minusDays(60), today.minusDays(46), today.minusDays(40) },
            new Object[]{ customers.get(1), new BigDecimal("220339"), Invoice.InvoiceStatus.PENDING, today.minusDays(8),  today.plusDays(7),   null               }
        );

        List<Invoice> invoices = rows.stream().map(r -> {
            Customer c     = (Customer)              r[0];
            BigDecimal sub = (BigDecimal)             r[1];
            Invoice.InvoiceStatus st = (Invoice.InvoiceStatus) r[2];
            LocalDate issued = (LocalDate)            r[3];
            LocalDate due    = (LocalDate)            r[4];
            LocalDate paid   = (LocalDate)            r[5];

            BigDecimal gstAmt = sub.multiply(new BigDecimal("0.18")).setScale(0, RoundingMode.HALF_UP);
            BigDecimal total  = sub.add(gstAmt);

            Invoice i = new Invoice();
            i.setTenantId(TENANT); i.setDeleted(false);
            i.setInvoiceNumber(String.format("INV-%04d", inv[0]++));
            i.setCustomer(c);
            i.setStatus(st);
            i.setIssueDate(issued); i.setDueDate(due); i.setPaidDate(paid);
            i.setSubtotal(sub); i.setGstRate(new BigDecimal("18")); i.setGstAmount(gstAmt); i.setTotal(total);
            i.setNotes(st == Invoice.InvoiceStatus.OVERDUE ? "Payment follow-up required." : null);
            i.setCreatedAt(issued.atStartOfDay());
            i.setUpdatedAt(issued.atStartOfDay());
            return i;
        }).toList();

        invoiceRepository.saveAll(invoices);
    }

    // ── Notifications ──────────────────────────────────────────────

    private void seedNotifications(User admin) {
        List<Notification> notifs = List.of(
            notif(admin, "New Hot Lead", "Vijay Kumar (HCL Tech) scored HOT — 91/100. Call recommended.", Notification.NotificationType.LEAD, false),
            notif(admin, "Deal Won", "Bajaj Finserv Analytics deal closed — ₹3.1L revenue.", Notification.NotificationType.DEAL, false),
            notif(admin, "Follow-up Overdue", "Sunita Rao (Wipro) proposal pending for 7 days. Send reminder.", Notification.NotificationType.TASK, false),
            notif(admin, "Invoice Overdue", "INV-0004 from Bajaj Finserv is 5 days overdue.", Notification.NotificationType.INVOICE, false),
            notif(admin, "AI Insight", "HCL Tech Package has 89% win probability — schedule closing call.", Notification.NotificationType.AI, true),
            notif(admin, "Lead Assigned", "Kiran Mehta assigned to Amit Kapoor from Instagram campaign.", Notification.NotificationType.LEAD, true),
            notif(admin, "Deal Stage Updated", "InfoSys Enterprise moved to Qualified by Priya Singh.", Notification.NotificationType.DEAL, true),
            notif(admin, "Payment Received", "INV-0001 (Mindtree) — ₹3.2L payment confirmed.", Notification.NotificationType.INVOICE, true),
            notif(admin, "New Referral Lead", "Rajesh Singh (Mindtree) referred by existing customer.", Notification.NotificationType.LEAD, true),
            notif(admin, "Automation Triggered", "Welcome email sent to 3 new leads via workflow.", Notification.NotificationType.AUTOMATION, true)
        );
        notificationRepository.saveAll(notifs);
    }

    private Notification notif(User user, String title, String message,
                                Notification.NotificationType type, boolean read) {
        Notification n = new Notification();
        n.setTenantId(TENANT); n.setDeleted(false);
        n.setUser(user); n.setTitle(title); n.setMessage(message);
        n.setType(type); n.setIsRead(read);
        n.setCreatedAt(LocalDateTime.now().minusHours(read ? 6 : 1));
        n.setUpdatedAt(n.getCreatedAt());
        return n;
    }
}
