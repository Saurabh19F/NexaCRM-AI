package com.nexacrm.selenium;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.junit.jupiter.api.*;
import org.openqa.selenium.*;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

/**
 * Base class for all Selenium UI tests.
 *
 * Configuration via environment variables / system properties:
 *   NEXACRM_BASE_URL  – frontend URL  (default: http://localhost:5173)
 *   NEXACRM_HEADLESS  – run headless  (default: true)
 *   NEXACRM_TEST_EMAIL    – login email
 *   NEXACRM_TEST_PASSWORD – login password
 */
public abstract class SeleniumBaseTest {

    protected static WebDriver driver;
    protected static WebDriverWait wait;
    protected static String baseUrl;
    protected static String testEmail;
    protected static String testPassword;

    @BeforeAll
    static void setupDriver() {
        baseUrl      = env("NEXACRM_BASE_URL",      "https://www.automationbysj.site");
        testEmail    = env("NEXACRM_TEST_EMAIL",     "saurabhke4@gmail.com");
        testPassword = env("NEXACRM_TEST_PASSWORD",  "demo1234");

        WebDriverManager.chromedriver().setup();

        ChromeOptions options = new ChromeOptions();
        if (Boolean.parseBoolean(env("NEXACRM_HEADLESS", "true"))) {
            options.addArguments("--headless=new");
        }
        options.addArguments(
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--window-size=1920,1080",
            "--disable-extensions",
            "--remote-allow-origins=*"
        );

        driver = new ChromeDriver(options);
        driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(5));
        wait = new WebDriverWait(driver, Duration.ofSeconds(15));
    }

    @AfterAll
    static void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────

    protected void navigateTo(String path) {
        driver.get(baseUrl + path);
    }

    /** Wait for an element to be visible and return it. */
    protected WebElement waitForVisible(By locator) {
        return wait.until(ExpectedConditions.visibilityOfElementLocated(locator));
    }

    /** Wait for an element to be clickable and return it. */
    protected WebElement waitForClickable(By locator) {
        return wait.until(ExpectedConditions.elementToBeClickable(locator));
    }

    /** Wait until the URL contains the given substring. */
    protected void waitForUrlContains(String substring) {
        wait.until(ExpectedConditions.urlContains(substring));
    }

    /** Wait for page title to contain text. */
    protected void waitForTitleContains(String text) {
        wait.until(ExpectedConditions.titleContains(text));
    }

    /** Check if an element exists on the page. */
    protected boolean elementExists(By locator) {
        try {
            driver.findElement(locator);
            return true;
        } catch (NoSuchElementException e) {
            return false;
        }
    }

    /** Take a screenshot (useful for debugging failures). */
    protected byte[] takeScreenshot() {
        return ((TakesScreenshot) driver).getScreenshotAs(OutputType.BYTES);
    }

    /** Log into NexaCRM using the test credentials. */
    protected void loginAsTestUser() {
        navigateTo("/login");

        WebElement emailInput = waitForVisible(By.cssSelector("input[type='email']"));
        emailInput.clear();
        emailInput.sendKeys(testEmail);

        WebElement passwordInput = driver.findElement(By.cssSelector("input[type='password']"));
        passwordInput.clear();
        passwordInput.sendKeys(testPassword);

        // Click the Sign In button
        WebElement submitBtn = driver.findElement(By.cssSelector("button[type='submit']"));
        submitBtn.click();

        // Wait for redirect to dashboard
        waitForUrlContains("/dashboard");
    }

    private static String env(String key, String fallback) {
        String val = System.getenv(key);
        if (val != null && !val.isBlank()) return val;
        val = System.getProperty(key);
        if (val != null && !val.isBlank()) return val;
        return fallback;
    }
}
