import {expect, test} from '@playwright/test';

test('Click Me If You Can', async ({page}) => {
    await page.goto('https://obstaclecourse.tricentis.com/Obstacles/41040');
    await page.getByRole('button', {name: 'Click me if you can'})
        .press("Enter");
    await expect(page.getByText('You solved this automation problem.')).toBeVisible();
});

test('Extracting Text', { tag: ["@Regression", "@Sanity"] }, async ({page}) => {
    await page.goto('https://obstaclecourse.tricentis.com/Obstacles/81012');
    let totalAmount = await page.locator('#alerttext')
        .textContent()
        .then(t => /\$(?<TotalAmount>\d+\.\d+)/.exec(t).groups.TotalAmount);
    await page.locator('#totalamountText').fill(totalAmount);
    await expect(page.getByText('You solved this automation problem.')).toBeVisible();
});

test('And Counting', async ({page}) => {
    await page.goto('https://obstaclecourse.tricentis.com/Obstacles/24499');
    let text = await page.locator('#typeThis').textContent();
    let countOfElements = await page.locator('#autocomplete')
        .locator('option')
        .filter({hasText: new RegExp(String.raw`^${text}`, "g")})
        .count();
    await page.locator('#entryCount').fill(countOfElements.toString());
    await expect(page.getByText('You solved this automation problem.')).toBeVisible();
});

test('Red Stripe', async ({page}) => {
    await page.goto('https://obstaclecourse.tricentis.com/Obstacles/30034');
    await page.locator('#generate').click();
    await page.locator('//div[@id=\'number\']//following-sibling::div').click();
    await expect(page.getByText('You solved this automation problem.')).toBeVisible();
});

test('The Last Row', async ({page}) => {
    await page.goto('https://obstaclecourse.tricentis.com/Obstacles/70310');
    let lastOrderValue = await page.locator('#orderTable')
        .locator('tr')
        .last()
        .locator('td')
        .filter({hasText: new RegExp(String.raw`\d+`)})
        .textContent()
    await page.locator('#ordervalue').fill(lastOrderValue.trim());
    await expect(page.getByText('You solved this automation problem.')).toBeVisible();
});

test('Table Search', async ({page}) => {
    await page.goto('https://obstaclecourse.tricentis.com/Obstacles/41036');
    let result = await page.locator('#randomTable')
        .locator('td')
        .filter({hasText: '15'})
        .count();
    await page.locator('#resulttext').fill(result ? 'True' : 'False');
    await expect(page.getByText('You solved this automation problem.')).toBeVisible();
});

test('Find The Changed Cell', async ({page}) => {
    await page.goto('https://obstaclecourse.tricentis.com/Obstacles/73591');

    // Optimized function to extract table data in from browser context
    let getTableData = async function (page) {
        return await page.evaluate(() => {
            const table = document.querySelector('#tableContent table');
            const rows = table.querySelectorAll('tr');
            const data = [];

            for (const row of rows) {
                const cells = row.querySelectorAll('td');
                const rowData = [];
                for (const cell of cells) {
                    rowData.push(cell.textContent.trim());
                }
                data.push(rowData);
            }

            return data;
        });
    };

    let originalTable = await getTableData(page);
    await page.locator('#change').click();
    await expect(page.locator('#tableLabel')).toHaveText('Changed Table');
    let changedTable = await getTableData(page);

    let changeDetected = false;
    for (let i = 0; i < originalTable.length; i++) {
        for (let j = 0; j < originalTable[0].length; j++) {
            if (originalTable[i][j] !== changedTable[i][j]) {
                await page.locator('#rowNumber').fill((i + 1).toString());
                await page.locator('#columnNumber').fill((j + 1).toString());
                await page.locator('#originalValue').fill(originalTable[i][j]);
                await page.locator('#changedValue').fill(changedTable[i][j]);

                changeDetected = true;
                break;
            }
        }
        if (changeDetected) break;
    }

    await page.locator('#submit').click();
    await page.evaluate('check()'); // Temporary as submit button is not working
    await expect(page.getByText('You solved this automation problem.')).toBeVisible();
});

test('Hidden Element', async ({page}) => {
    await page.goto('https://obstaclecourse.tricentis.com/Obstacles/66666');
    await page.locator('#clickthis').click();
    await expect(page.getByText('You solved this automation problem.')).toBeVisible();
});

test('Future Christmas', async ({page}) => {
    await page.goto('https://obstaclecourse.tricentis.com/Obstacles/21269');
    let christmasDate = async function () {
        let today = new Date();
        let year = today.getFullYear() + 2;
        if (today.getMonth() === 11 && today.getDate() > 25)
            year += 1;
        let christmasDate = new Date(year, 11, 25); // December 25th of the calculated year
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        return dayNames[christmasDate.getDay()];
    };
    await page.locator('#christmasday').fill(await christmasDate());
    await expect(page.getByText('You solved this automation problem.')).toBeVisible();
});

test('Toscabot Can Fly', async ({page}) => {
    await page.goto('https://obstaclecourse.tricentis.com/Obstacles/60469');
    await page.dragAndDrop('#toscabot', '#to');
    await expect(page.getByText('You solved this automation problem.')).toBeVisible();
});

test('Wait a Moment', async ({page}) => {
    await page.goto('https://obstaclecourse.tricentis.com/Obstacles/33678');
    await page.locator('#one').click();
    await page.locator('#two').click();
    await expect(page.getByText('You solved this automation problem.')).toBeVisible();
});

// Temp: UI is not responsing as of now
test.skip('Find and Fill', async ({page}) => {
    await page.goto('https://obstaclecourse.tricentis.com/Obstacles/73590');
    await page.locator('#pass').click();
    await page.locator('#actual').fill('ABC');
    await page.locator('#sample').click();
    await expect(page.getByText('You solved this automation problem.')).toBeVisible();
});

test('Empty', async ({page}) => {
    await page.goto('https://obstaclecourse.tricentis.com/Obstacles/66667');
    await page.locator('#generate').click();
    let count = await page.locator('.checkpoint').count();
    for (let i = 0; i < count; i++) {
        await page.locator(`#checkpoint${i}`).click();
    }
    await expect(page.getByText('You solved this automation problem.')).toBeVisible();
});

test('Ids Are Not Everything', async ({page}) => {
    await page.goto('https://obstaclecourse.tricentis.com/Obstacles/22505');
    await page.getByText('Click me!').click();
    await expect(page.getByText('You solved this automation problem.')).toBeVisible();
});

test('Math', async ({page}) => {
    await page.goto('https://obstaclecourse.tricentis.com/Obstacles/32403');
    let no1 = parseInt(await page.locator('#no1').textContent());
    let no2 = parseInt(await page.locator('#no2').textContent());
    let operator = (await page.locator('#symbol1').textContent()).trim();
    let mathOperations = {
        '+': (a, b) => a + b,
        '-': (a, b) => a - b,
        '*': (a, b) => a * b,
        '/': (a, b) => a / b,
        '%': (a, b) => a % b
    }
    let result = mathOperations[operator](no1, no2).toString();
    await page.locator('#result').fill(result);
    await expect(page.getByText('You solved this automation problem.')).toBeVisible();
});

test('Addition', async ({page}) => {
    await page.goto('https://obstaclecourse.tricentis.com/Obstacles/78264');
    let no1 = parseInt(await page.locator('#no1').textContent());
    let no2 = parseInt(await page.locator('#no2').textContent());
    let result = (no1 + no2).toString();
    await page.locator('#result').fill(result);
    await expect(page.getByText('You solved this automation problem.')).toBeVisible();
});

test('Errors Occur', async ({page}) => {
    await page.goto("https://obstaclecourse.tricentis.com/Obstacles/70924");
    const button = await page.locator('//button[@id=\'tech\']/preceding-sibling::button');
    let buttonText;
    do {
        await button.click();
        buttonText = await button.textContent();
        if (buttonText === 'ERROR')
            await page.locator('#tech').click();
    } while (parseInt(buttonText) !== 10);
    await expect(page.getByText('You solved this automation problem.')).toBeVisible();
});

test('Twins', async ({page}) => {
    await page.goto('https://obstaclecourse.tricentis.com/Obstacles/12952');
    await page.locator('(//a[text()=\'I am the one!\'])[2]').click();
    await expect(page.getByText('You solved this automation problem.')).toBeVisible();
});

test('Not a table', async ({page}) => {
    await page.goto('https://obstaclecourse.tricentis.com/Obstacles/64161');
    await page.locator('#generate').click();
    let orderId = (await page.locator('//div[text()=\'order id\']/following-sibling::div')
        .textContent()).trim();
    await page.locator('#offerId').fill(orderId);
    await expect(page.getByText('You solved this automation problem.')).toBeVisible();
});

test('Popup Windows', async ({page}) => {
    await page.goto('https://obstaclecourse.tricentis.com/Obstacles/51130');

    // Start waiting for popup before clicking. Note no await.
    const popupPromise = page.waitForEvent('popup');
    await page.locator('#button').click();
    const popup = await popupPromise;

    // Interact with the new popup normally.
    console.log(await popup.title());
    await popup.close();

    await expect(page.getByText('You solved this automation problem.')).toBeVisible();
});
