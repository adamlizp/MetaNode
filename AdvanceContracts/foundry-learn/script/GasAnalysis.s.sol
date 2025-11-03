// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/Calculator.sol";
import "../src/CalculatorOptimized.sol";

/**
 * @title GasAnalysisScript
 * @dev Script to collect detailed gas consumption data
 */
contract GasAnalysisScript is Script {
    Calculator public calculator;
    CalculatorOptimized public calculatorOptimized;

    function run() external {
        console.log("=== Foundry Gas Analysis Report ===");
        console.log("Timestamp:", block.timestamp);
        console.log("Block Number:", block.number);
        console.log("");

        // Deploy contracts and analyze deployment costs
        analyzeDeploymentCosts();

        // Analyze basic operations
        analyzeBasicOperations();

        // Analyze batch operations
        analyzeBatchOperations();

        // Analyze pure functions
        analyzePureFunctions();

        // Comprehensive comparison
        comprehensiveComparison();

        console.log("=== Analysis Complete ===");
    }

    function analyzeDeploymentCosts() internal {
        console.log("--- DEPLOYMENT COSTS ---");

        uint256 gasStart = gasleft();
        calculator = new Calculator();
        uint256 originalDeployGas = gasStart - gasleft();

        gasStart = gasleft();
        calculatorOptimized = new CalculatorOptimized();
        uint256 optimizedDeployGas = gasStart - gasleft();

        console.log("Original Calculator Deployment Gas:", originalDeployGas);
        console.log("Optimized Calculator Deployment Gas:", optimizedDeployGas);

        if (originalDeployGas > optimizedDeployGas) {
            uint256 savings = originalDeployGas - optimizedDeployGas;
            uint256 savingsPercent = (savings * 100) / originalDeployGas;
            console.log("Deployment Gas Saved:", savings);
            console.log("Deployment Gas Savings Percent:", savingsPercent, "%");
        }
        console.log("");
    }

    function analyzeBasicOperations() internal {
        console.log("--- BASIC OPERATIONS COMPARISON ---");

        // Addition
        uint256 gasStart = gasleft();
        calculator.add(100, 200);
        uint256 originalAddGas = gasStart - gasleft();

        gasStart = gasleft();
        calculatorOptimized.add(100, 200);
        uint256 optimizedAddGas = gasStart - gasleft();

        console.log("Addition - Original:", originalAddGas, "gas");
        console.log("Addition - Optimized:", optimizedAddGas, "gas");
        console.log("Addition - Savings:", originalAddGas > optimizedAddGas ? originalAddGas - optimizedAddGas : 0, "gas");

        // Subtraction
        gasStart = gasleft();
        calculator.subtract(300, 100);
        uint256 originalSubGas = gasStart - gasleft();

        gasStart = gasleft();
        calculatorOptimized.subtract(300, 100);
        uint256 optimizedSubGas = gasStart - gasleft();

        console.log("Subtraction - Original:", originalSubGas, "gas");
        console.log("Subtraction - Optimized:", optimizedSubGas, "gas");
        console.log("Subtraction - Savings:", originalSubGas > optimizedSubGas ? originalSubGas - optimizedSubGas : 0, "gas");

        // Multiplication
        gasStart = gasleft();
        calculator.multiply(25, 8);
        uint256 originalMulGas = gasStart - gasleft();

        gasStart = gasleft();
        calculatorOptimized.multiply(25, 8);
        uint256 optimizedMulGas = gasStart - gasleft();

        console.log("Multiplication - Original:", originalMulGas, "gas");
        console.log("Multiplication - Optimized:", optimizedMulGas, "gas");
        console.log("Multiplication - Savings:", originalMulGas > optimizedMulGas ? originalMulGas - optimizedMulGas : 0, "gas");

        // Division
        gasStart = gasleft();
        calculator.divide(144, 12);
        uint256 originalDivGas = gasStart - gasleft();

        gasStart = gasleft();
        calculatorOptimized.divide(144, 12);
        uint256 optimizedDivGas = gasStart - gasleft();

        console.log("Division - Original:", originalDivGas, "gas");
        console.log("Division - Optimized:", optimizedDivGas, "gas");
        console.log("Division - Savings:", originalDivGas > optimizedDivGas ? originalDivGas - optimizedDivGas : 0, "gas");
        console.log("");
    }

    function analyzeBatchOperations() internal {
        console.log("--- BATCH OPERATIONS ANALYSIS ---");

        // Original batch operations
        uint8[] memory operations = new uint8[](4);
        operations[0] = 0; operations[1] = 1; operations[2] = 2; operations[3] = 3;

        uint256[] memory operands = new uint256[](8);
        operands[0] = 100; operands[1] = 50;
        operands[2] = 200; operands[3] = 75;
        operands[4] = 25;  operands[5] = 4;
        operands[6] = 144; operands[7] = 12;

        uint256 gasStart = gasleft();
        calculator.batchOperations(operations, operands);
        uint256 originalBatchGas = gasStart - gasleft();

        // Optimized batch (calculateBatch)
        gasStart = gasleft();
        calculatorOptimized.calculateBatch(operands);
        uint256 optimizedBatchGas = gasStart - gasleft();

        // Individual operations for comparison
        gasStart = gasleft();
        calculator.add(100, 50);
        calculator.subtract(200, 75);
        calculator.multiply(25, 4);
        calculator.divide(144, 12);
        uint256 individualGas = gasStart - gasleft();

        console.log("Batch Operations - Original:", originalBatchGas, "gas");
        console.log("Batch Operations - Optimized:", optimizedBatchGas, "gas");
        console.log("Individual Operations:", individualGas, "gas");
        console.log("Batch vs Individual Savings:", individualGas > originalBatchGas ? individualGas - originalBatchGas : 0, "gas");
        console.log("Optimized Batch Savings:", originalBatchGas > optimizedBatchGas ? originalBatchGas - optimizedBatchGas : 0, "gas");
        console.log("");
    }

    function analyzePureFunctions() internal {
        console.log("--- PURE FUNCTIONS ANALYSIS ---");

        uint256 gasStart;

        gasStart = gasleft();
        calculatorOptimized.addPure(100, 200);
        uint256 pureAddGas = gasStart - gasleft();

        gasStart = gasleft();
        calculatorOptimized.subtractPure(300, 100);
        uint256 pureSubGas = gasStart - gasleft();

        gasStart = gasleft();
        calculatorOptimized.multiplyPure(25, 8);
        uint256 pureMulGas = gasStart - gasleft();

        gasStart = gasleft();
        calculatorOptimized.dividePure(144, 12);
        uint256 pureDivGas = gasStart - gasleft();

        console.log("Pure Addition Gas:", pureAddGas);
        console.log("Pure Subtraction Gas:", pureSubGas);
        console.log("Pure Multiplication Gas:", pureMulGas);
        console.log("Pure Division Gas:", pureDivGas);
        console.log("Pure Functions Total:", pureAddGas + pureSubGas + pureMulGas + pureDivGas);
        console.log("");
    }

    function comprehensiveComparison() internal {
        console.log("--- COMPREHENSIVE COMPARISON ---");

        uint256 gasStart;

        // Original contract all operations
        gasStart = gasleft();
        calculator.add(100, 200);
        calculator.subtract(300, 100);
        calculator.multiply(25, 8);
        calculator.divide(144, 12);
        uint256 originalTotal = gasStart - gasleft();

        // Optimized contract all operations
        gasStart = gasleft();
        calculatorOptimized.add(100, 200);
        calculatorOptimized.subtract(300, 100);
        calculatorOptimized.multiply(25, 8);
        calculatorOptimized.divide(144, 12);
        uint256 optimizedTotal = gasStart - gasleft();

        // Pure functions all operations
        gasStart = gasleft();
        calculatorOptimized.addPure(100, 200);
        calculatorOptimized.subtractPure(300, 100);
        calculatorOptimized.multiplyPure(25, 8);
        calculatorOptimized.dividePure(144, 12);
        uint256 pureTotal = gasStart - gasleft();

        console.log("All Operations - Original Contract:", originalTotal, "gas");
        console.log("All Operations - Optimized Contract:", optimizedTotal, "gas");
        console.log("All Operations - Pure Functions:", pureTotal, "gas");

        uint256 optimizedSavings = originalTotal > optimizedTotal ? originalTotal - optimizedTotal : 0;
        uint256 pureSavings = originalTotal > pureTotal ? originalTotal - pureTotal : 0;

        console.log("Optimized Contract Savings:", optimizedSavings, "gas");
        console.log("Pure Functions Savings:", pureSavings, "gas");

        if (originalTotal > 0) {
            console.log("Optimized Contract Savings Percent:", (optimizedSavings * 100) / originalTotal, "%");
            console.log("Pure Functions Savings Percent:", (pureSavings * 100) / originalTotal, "%");
        }
    }
}