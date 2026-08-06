package com.nexacrm.selenium;

import org.junit.jupiter.api.*;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Selenium tests for sidebar navigation and page routing after login.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class NavigationTest extends SeleniumBaseTest {

    private static boolean loggedIn = false;

    @BeforeEach
    void ensureLoggedIn() {
        if (!loggedIn) {
            // Small delay to avoid rate-limiting from prior test class logins
            try { Thread.sleep(2000); } catch (InterruptedException ignored) {}
            loginAsTestUser();
            loggedIn = true;
        }
    }

    @Test
    @Order(1)
    @DisplayName("Sidebar is visible after login")
    void sidebarVisible() {
        // Look for nav/aside element
        boolean hasSidebar = elementExists(By.tagName("aside"))
                || elementExists(By.tagName("nav"))
                || elementExists(By.cssSelector("[class*='sidebar']"));
        assertTrue(hasSidebar, "Sidebar or nav element should exist");
    }

    @Test
    @Order(2)
    @DisplayName("Navigate to Leads page")
    void navigateToLeads() {
        navigateTo("/leads");
        waitForUrlContains("/leads");
        assertTrue(driver.getCurrentUrl().contains("/leads"));
    }

    @Test
    @Order(3)
    @DisplayName("Navigate to Pipeline/Kanban page")
    void navigateToPipeline() {
        navigateTo("/pipeline");
        waitForUrlContains("/pipeline");
        assertTrue(driver.getCurrentUrl().contains("/pipeline"));
    }

    @Test
    @Order(4)
    @DisplayName("Navigate to Customers page")
    void navigateToCustomers() {
        navigateTo("/customers");
        waitForUrlContains("/customers");
        assertTrue(driver.getCurrentUrl().contains("/customers"));
    }

    @Test
    @Order(5)
    @DisplayName("Navigate to Tasks page")
    void navigateToTasks() {
        navigateTo("/task-followup");
        waitForUrlContains("/task-followup");
        assertTrue(driver.getCurrentUrl().contains("/task-followup"));
    }

    @Test
    @Order(6)
    @DisplayName("Navigate to Communication page")
    void navigateToCommunication() {
        navigateTo("/communication");
        waitForUrlContains("/communication");
        assertTrue(driver.getCurrentUrl().contains("/communication"));
    }

    @Test
    @Order(7)
    @DisplayName("Navigate to Invoices page")
    void navigateToInvoices() {
        navigateTo("/invoices");
        waitForUrlContains("/invoices");
        assertTrue(driver.getCurrentUrl().contains("/invoices"));
    }

    @Test
    @Order(8)
    @DisplayName("Navigate to Analytics page")
    void navigateToAnalytics() {
        navigateTo("/analytics");
        waitForUrlContains("/analytics");
        assertTrue(driver.getCurrentUrl().contains("/analytics"));
    }

    @Test
    @Order(9)
    @DisplayName("Navigate to Settings page")
    void navigateToSettings() {
        navigateTo("/settings");
        waitForUrlContains("/settings");
        assertTrue(driver.getCurrentUrl().contains("/settings"));
    }

    @Test
    @Order(10)
    @DisplayName("Navigate to Tickets page")
    void navigateToTickets() {
        navigateTo("/tickets");
        waitForUrlContains("/tickets");
        assertTrue(driver.getCurrentUrl().contains("/tickets"));
    }

    @Test
    @Order(11)
    @DisplayName("Navigate to Profile page")
    void navigateToProfile() {
        navigateTo("/profile");
        waitForUrlContains("/profile");
        assertTrue(driver.getCurrentUrl().contains("/profile"));
    }

    @Test
    @Order(12)
    @DisplayName("Unknown route redirects to dashboard or login")
    void unknownRouteRedirects() {
        navigateTo("/this-page-does-not-exist");
        try { Thread.sleep(1500); } catch (InterruptedException ignored) {}

        String url = driver.getCurrentUrl();
        assertTrue(url.contains("/dashboard") || url.contains("/login") || url.contains("/admin"),
            "Unknown route should redirect, got: " + url);
    }
}
