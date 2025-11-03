// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../src/Calculator.sol";
import "../src/CalculatorOptimized.sol";

/**
 * @title ComprehensiveGasAnalysisTest
 * @dev Complete gas analysis test suite for optimization comparison
 */
contract ComprehensiveGasAnalysisTest {
    Calculator public calculator;
    CalculatorOptimized public calculatorOptimized;

    event GasReport(string testName, uint256 originalGas, uint256 optimizedGas, uint256 savings, uint256 savingsPercent);
    event SingleGasReport(string testName, uint256 gasUsed);

    function setUp() public {
        calculator = new Calculator();
        calculatorOptimized = new CalculatorOptimized();
    }

    /*//////////////////////////////////////////////////////////////
                        DEPLOYMENT COST COMPARISON
    //////////////////////////////////////////////////////////////*/

    function testDeploymentCosts() external {
        uint256 gasStart;
        uint256 originalDeployGas;
        uint256 optimizedDeployGas;

        // Test original calculator deployment
        gasStart = gasleft();
        Calculator newCalculator = new Calculator();
        originalDeployGas = gasStart - gasleft();

        // Test optimized calculator deployment
        gasStart = gasleft();
        CalculatorOptimized newOptimizedCalculator = new CalculatorOptimized();
        optimizedDeployGas = gasStart - gasleft();

        uint256 savings = originalDeployGas > optimizedDeployGas ? originalDeployGas - optimizedDeployGas : 0;
        uint256 savingsPercent = originalDeployGas > 0 ? (savings * 100) / originalDeployGas : 0;

        emit GasReport("Deployment", originalDeployGas, optimizedDeployGas, savings, savingsPercent);

        // Clean up to avoid unused variable warnings
        newCalculator.operationCount();
        newOptimizedCalculator.operationCount();
    }

    /*//////////////////////////////////////////////////////////////
                        BASIC OPERATIONS COMPARISON
    //////////////////////////////////////////////////////////////*/

    function testAdditionGasComparison() external {
        uint256 gasStart;

        // Original contract
        gasStart = gasleft();
        calculator.add(100, 200);
        uint256 originalGas = gasStart - gasleft();

        // Optimized contract
        gasStart = gasleft();
        calculatorOptimized.add(100, 200);
        uint256 optimizedGas = gasStart - gasleft();

        uint256 savings = originalGas > optimizedGas ? originalGas - optimizedGas : 0;
        uint256 savingsPercent = originalGas > 0 ? (savings * 100) / originalGas : 0;

        emit GasReport("Addition", originalGas, optimizedGas, savings, savingsPercent);
    }

    function testSubtractionGasComparison() external {
        uint256 gasStart;

        // Original contract
        gasStart = gasleft();
        calculator.subtract(300, 100);
        uint256 originalGas = gasStart - gasleft();

        // Optimized contract
        gasStart = gasleft();
        calculatorOptimized.subtract(300, 100);
        uint256 optimizedGas = gasStart - gasleft();

        uint256 savings = originalGas > optimizedGas ? originalGas - optimizedGas : 0;
        uint256 savingsPercent = originalGas > 0 ? (savings * 100) / originalGas : 0;

        emit GasReport("Subtraction", originalGas, optimizedGas, savings, savingsPercent);
    }

    function testMultiplicationGasComparison() external {
        uint256 gasStart;

        // Original contract
        gasStart = gasleft();
        calculator.multiply(25, 8);
        uint256 originalGas = gasStart - gasleft();

        // Optimized contract
        gasStart = gasleft();
        calculatorOptimized.multiply(25, 8);
        uint256 optimizedGas = gasStart - gasleft();

        uint256 savings = originalGas > optimizedGas ? originalGas - optimizedGas : 0;
        uint256 savingsPercent = originalGas > 0 ? (savings * 100) / originalGas : 0;

        emit GasReport("Multiplication", originalGas, optimizedGas, savings, savingsPercent);
    }

    function testDivisionGasComparison() external {
        uint256 gasStart;

        // Original contract
        gasStart = gasleft();
        calculator.divide(144, 12);
        uint256 originalGas = gasStart - gasleft();

        // Optimized contract
        gasStart = gasleft();
        calculatorOptimized.divide(144, 12);
        uint256 optimizedGas = gasStart - gasleft();

        uint256 savings = originalGas > optimizedGas ? originalGas - optimizedGas : 0;
        uint256 savingsPercent = originalGas > 0 ? (savings * 100) / originalGas : 0;

        emit GasReport("Division", originalGas, optimizedGas, savings, savingsPercent);
    }

    /*//////////////////////////////////////////////////////////////
                        PURE FUNCTIONS GAS ANALYSIS
    //////////////////////////////////////////////////////////////*/

    function testPureFunctionsGas() external {
        uint256 gasStart;

        // Pure addition
        gasStart = gasleft();
        calculatorOptimized.addPure(100, 200);
        uint256 pureAddGas = gasStart - gasleft();
        emit SingleGasReport("Pure Addition", pureAddGas);

        // Pure subtraction
        gasStart = gasleft();
        calculatorOptimized.subtractPure(300, 100);
        uint256 pureSubGas = gasStart - gasleft();
        emit SingleGasReport("Pure Subtraction", pureSubGas);

        // Pure multiplication
        gasStart = gasleft();
        calculatorOptimized.multiplyPure(25, 8);
        uint256 pureMulGas = gasStart - gasleft();
        emit SingleGasReport("Pure Multiplication", pureMulGas);

        // Pure division
        gasStart = gasleft();
        calculatorOptimized.dividePure(144, 12);
        uint256 pureDivGas = gasStart - gasleft();
        emit SingleGasReport("Pure Division", pureDivGas);
    }

    /*//////////////////////////////////////////////////////////////
                        BATCH OPERATIONS COMPARISON
    //////////////////////////////////////////////////////////////*/

    function testBatchOperationsComparison() external {
        uint256 gasStart;

        // Original batch operations
        uint8[] memory operations = new uint8[](4);
        operations[0] = 0; operations[1] = 1; operations[2] = 2; operations[3] = 3;

        uint256[] memory operands = new uint256[](8);
        operands[0] = 100; operands[1] = 50;
        operands[2] = 200; operands[3] = 75;
        operands[4] = 25;  operands[5] = 4;
        operands[6] = 144; operands[7] = 12;

        gasStart = gasleft();
        calculator.batchOperations(operations, operands);
        uint256 originalBatchGas = gasStart - gasleft();

        // Optimized batch operations (calculateBatch)
        gasStart = gasleft();
        calculatorOptimized.calculateBatch(operands);
        uint256 optimizedBatchGas = gasStart - gasleft();

        uint256 savings = originalBatchGas > optimizedBatchGas ? originalBatchGas - optimizedBatchGas : 0;
        uint256 savingsPercent = originalBatchGas > 0 ? (savings * 100) / originalBatchGas : 0;

        emit GasReport("Batch Operations", originalBatchGas, optimizedBatchGas, savings, savingsPercent);
    }

    function testIndividualVsBatchOperations() external {
        uint256 gasStart;

        // Individual operations
        gasStart = gasleft();
        calculator.add(100, 50);
        calculator.subtract(200, 75);
        calculator.multiply(25, 4);
        calculator.divide(144, 12);
        uint256 individualGas = gasStart - gasleft();

        // Batch operations
        uint8[] memory operations = new uint8[](4);
        operations[0] = 0; operations[1] = 1; operations[2] = 2; operations[3] = 3;

        uint256[] memory operands = new uint256[](8);
        operands[0] = 100; operands[1] = 50;
        operands[2] = 200; operands[3] = 75;
        operands[4] = 25;  operands[5] = 4;
        operands[6] = 144; operands[7] = 12;

        gasStart = gasleft();
        calculator.batchOperations(operations, operands);
        uint256 batchGas = gasStart - gasleft();

        uint256 savings = individualGas > batchGas ? individualGas - batchGas : 0;
        uint256 savingsPercent = individualGas > 0 ? (savings * 100) / individualGas : 0;

        emit GasReport("Individual vs Batch", individualGas, batchGas, savings, savingsPercent);
    }

    /*//////////////////////////////////////////////////////////////
                        STRESS TESTING
    //////////////////////////////////////////////////////////////*/

    function testStressOriginalContract(uint256 iterations) external {
        require(iterations <= 50, "Too many iterations for test");

        uint256 gasStart = gasleft();

        for (uint256 i = 1; i <= iterations; i++) {
            calculator.add(i, i * 2);
            if (i >= 2) {
                calculator.subtract(i * 2, i);
            }
            if (i % 3 == 0) {
                calculator.multiply(i, 2);
            }
            if (i >= 4 && i % 4 == 0) {
                calculator.divide(i * 4, 4);
            }
        }

        uint256 gasUsed = gasStart - gasleft();
        emit SingleGasReport("Stress Test Original", gasUsed);
    }

    function testStressOptimizedContract(uint256 iterations) external {
        require(iterations <= 50, "Too many iterations for test");

        uint256 gasStart = gasleft();

        for (uint256 i = 1; i <= iterations; i++) {
            calculatorOptimized.add(i, i * 2);
            if (i >= 2) {
                calculatorOptimized.subtract(i * 2, i);
            }
            if (i % 3 == 0) {
                calculatorOptimized.multiply(i, 2);
            }
            if (i >= 4 && i % 4 == 0) {
                calculatorOptimized.divide(i * 4, 4);
            }
        }

        uint256 gasUsed = gasStart - gasleft();
        emit SingleGasReport("Stress Test Optimized", gasUsed);
    }

    function testStressPureFunctions(uint256 iterations) external {
        require(iterations <= 100, "Too many iterations for test");

        uint256 gasStart = gasleft();

        for (uint256 i = 1; i <= iterations; i++) {
            calculatorOptimized.addPure(i, i * 2);
            if (i >= 2) {
                calculatorOptimized.subtractPure(i * 2, i);
            }
            if (i % 3 == 0) {
                calculatorOptimized.multiplyPure(i, 2);
            }
            if (i >= 4 && i % 4 == 0) {
                calculatorOptimized.dividePure(i * 4, 4);
            }
        }

        uint256 gasUsed = gasStart - gasleft();
        emit SingleGasReport("Stress Test Pure Functions", gasUsed);
    }

    /*//////////////////////////////////////////////////////////////
                        COMPREHENSIVE COMPARISON
    //////////////////////////////////////////////////////////////*/

    function testComprehensiveComparison() external {
        // Run all basic operations and compare total gas
        uint256 gasStart;

        // Original contract total
        gasStart = gasleft();
        calculator.add(100, 200);
        calculator.subtract(300, 100);
        calculator.multiply(25, 8);
        calculator.divide(144, 12);
        uint256 originalTotal = gasStart - gasleft();

        // Optimized contract total
        gasStart = gasleft();
        calculatorOptimized.add(100, 200);
        calculatorOptimized.subtract(300, 100);
        calculatorOptimized.multiply(25, 8);
        calculatorOptimized.divide(144, 12);
        uint256 optimizedTotal = gasStart - gasleft();

        // Pure functions total
        gasStart = gasleft();
        calculatorOptimized.addPure(100, 200);
        calculatorOptimized.subtractPure(300, 100);
        calculatorOptimized.multiplyPure(25, 8);
        calculatorOptimized.dividePure(144, 12);
        uint256 pureTotal = gasStart - gasleft();

        uint256 savings = originalTotal > optimizedTotal ? originalTotal - optimizedTotal : 0;
        uint256 savingsPercent = originalTotal > 0 ? (savings * 100) / originalTotal : 0;

        emit GasReport("All Operations Combined", originalTotal, optimizedTotal, savings, savingsPercent);
        emit SingleGasReport("Pure Functions Total", pureTotal);
    }
}