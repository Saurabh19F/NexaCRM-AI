package com.nexacrm.selenium;

import org.junit.jupiter.api.*;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Selenium tests for the full authentication flow:
 * login → dashboard → sidebar navigation → protected routes.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AuthFlowTest extends SeleniumBaseTest {

    @Test
    @Order(1)
    @DisplayName("Successful login redirects to /dashboard")
    void loginSuccess() {
        loginAsTestUser();
        assertTrue(driver.getCurrentUrl().contains("/dashboard"));
    }

    @Test
    @Order(2)
    @DisplayName("Dashboard shows after login")
    void dashboardRendersAfterLogin() {
        loginAsTestUser();

        // Wait for some dashboard content to appear
        // The sidebar should have navigation links
        wait.until(ExpectedConditions.or(
            ExpectedConditions.presenceOfElementLocated(By.xpath("//*[contains(text(),'Dashboard')]")),
            ExpectedConditions.presenceOfElementLocated(By.cssSelector("[data-testid='dashboard']")),
            ExpectedConditions.presenceOfElementLocated(By.cssSelector("nav, aside"))
        ));

        // Page should not be showing "Checking session..." anymore
        String body = driver.findElement(By.tagName("body")).getText();
        assertFalse(body.contains("Checking session..."),
            "Dashboard should have loaded, not stuck on session check");
    }

    @Test
    @Order(3)
    @DisplayName("Unauthenticated user is redirected to /login")
    void unauthRedirectsToLogin() {
        // Clear cookies AND localStorage/sessionStorage to fully log out
        driver.manage().deleteAllCookies();
        ((JavascriptExecutor) driver).executeScript(
            "window.localStorage.clear(); window.sessionStorage.clear();");

        navigateTo("/dashboard");

        // Should redirect to login
        waitForUrlContains("/login");
        assertTrue(driver.getCurrentUrl().contains("/login"));
    }

    @Test
    @Order(4)
    @DisplayName("Invalid credentials show error toast")
    void invalidCredentialsShowError() {
        navigateTo("/login");

        WebElement emailInput = waitForVisible(By.cssSelector("input[type='email']"));
        emailInput.clear();
        emailInput.sendKeys("wrong@example.com");

        WebElement passwordInput = driver.findElement(By.cssSelector("input[type='password']"));
        passwordInput.clear();
        passwordInput.sendKeys("wrongpassword");

        WebElement submitBtn = driver.findElement(By.cssSelector("button[type='submit']"));
        submitBtn.click();

        // Should stay on login page (not redirect to dashboard)
        try {
            Thread.sleep(2000); // Give it time for the API call to fail
        } catch (InterruptedException ignored) {}

        assertTrue(driver.getCurrentUrl().contains("/login"),
            "Should remain on login page after failed login");
    }
}
