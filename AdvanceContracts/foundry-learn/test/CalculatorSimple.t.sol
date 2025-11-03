// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../src/Calculator.sol";
import "../src/CalculatorOptimized.sol";

/**
 * @title CalculatorSimpleTest
 * @dev Simplified test suite for Calculator contracts with gas analysis
 */
contract CalculatorSimpleTest {
    Calculator public calculator;
    CalculatorOptimized public calculatorOptimized;
    
    // Simple assertion helper
    function assertEq(uint256 a, uint256 b, string memory message) internal pure {
        require(a == b, message);
    }
    
    function assertTrue(bool condition, string memory message) internal pure {
        require(condition, message);
    }
    
    constructor() {
        calculator = new Calculator();
        calculatorOptimized = new CalculatorOptimized();
    }
    
    /*//////////////////////////////////////////////////////////////
                            BASIC FUNCTIONALITY TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testBasicOperations() external {
        // Test addition
        uint256 result = calculator.add(5, 3);
        assertEq(result, 8, "Addition failed");
        
        // Test subtraction
        result = calculator.subtract(10, 3);
        assertEq(result, 7, "Subtraction failed");
        
        // Test multiplication
        result = calculator.multiply(4, 5);
        assertEq(result, 20, "Multiplication failed");
        
        // Test division
        result = calculator.divide(15, 3);
        assertEq(result, 5, "Division failed");
        
        // Check operation count
        assertEq(calculator.operationCount(), 4, "Operation count incorrect");
    }
    
    function testOptimizedOperations() external {
        // Test optimized contract
        uint256 result = calculatorOptimized.add(100, 200);
        assertEq(result, 300, "Optimized addition failed");
        
        result = calculatorOptimized.subtract(500, 100);
        assertEq(result, 400, "Optimized subtraction failed");
        
        result = calculatorOptimized.multiply(25, 4);
        assertEq(result, 100, "Optimized multiplication failed");
        
        result = calculatorOptimized.divide(144, 12);
        assertEq(result, 12, "Optimized division failed");
    }
    
    function testPureFunctions() external {
        // Test pure functions (no state changes)
        uint256 result = calculatorOptimized.addPure(50, 75);
        assertEq(result, 125, "Pure addition failed");
        
        result = calculatorOptimized.subtractPure(100, 25);
        assertEq(result, 75, "Pure subtraction failed");
        
        result = calculatorOptimized.multiplyPure(8, 9);
        assertEq(result, 72, "Pure multiplication failed");
        
        result = calculatorOptimized.dividePure(81, 9);
        assertEq(result, 9, "Pure division failed");
    }
    
    /*//////////////////////////////////////////////////////////////
                            GAS MEASUREMENT FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    function measureAdditionGas() external returns (uint256, uint256, uint256) {
        // Measure original contract
        uint256 gasStart = gasleft();
        calculator.add(100, 200);
        uint256 gasUsedOriginal = gasStart - gasleft();
        
        // Measure optimized contract
        gasStart = gasleft();
        calculatorOptimized.add(100, 200);
        uint256 gasUsedOptimized = gasStart - gasleft();
        
        // Measure pure function
        gasStart = gasleft();
        calculatorOptimized.addPure(100, 200);
        uint256 gasUsedPure = gasStart - gasleft();
        
        return (gasUsedOriginal, gasUsedOptimized, gasUsedPure);
    }
    
    function measureBatchOperationsGas() external returns (uint256, uint256) {
        // Prepare batch data
        uint8[] memory operations = new uint8[](4);
        operations[0] = 0; operations[1] = 1; operations[2] = 2; operations[3] = 3;
        
        uint256[] memory operands = new uint256[](8);
        operands[0] = 100; operands[1] = 50;
        operands[2] = 200; operands[3] = 75;
        operands[4] = 25;  operands[5] = 4;
        operands[6] = 144; operands[7] = 12;
        
        // Measure batch operations
        uint256 gasStart = gasleft();
        calculator.batchOperations(operations, operands);
        uint256 gasUsedBatch = gasStart - gasleft();
        
        // Measure individual operations
        gasStart = gasleft();
        calculator.add(100, 50);
        calculator.subtract(200, 75);
        calculator.multiply(25, 4);
        calculator.divide(144, 12);
        uint256 gasUsedIndividual = gasStart - gasleft();
        
        return (gasUsedBatch, gasUsedIndividual);
    }
    
    function measureOptimizedBatchGas() external returns (uint256) {
        uint256[] memory operands = new uint256[](8);
        operands[0] = 100; operands[1] = 50;
        operands[2] = 200; operands[3] = 75;
        operands[4] = 25;  operands[5] = 4;
        operands[6] = 144; operands[7] = 12;
        
        uint256 gasStart = gasleft();
        calculatorOptimized.calculateBatch(operands);
        uint256 gasUsed = gasStart - gasleft();
        
        return gasUsed;
    }
    
    /*//////////////////////////////////////////////////////////////
                            ERROR TESTING
    //////////////////////////////////////////////////////////////*/
    
    function testErrorCases() external {
        // Test division by zero (should revert)
        bool reverted = false;
        try calculator.divide(10, 0) {
            // Should not reach here
        } catch {
            reverted = true;
        }
        assertTrue(reverted, "Division by zero should revert");
        
        // Test subtraction underflow (should revert)
        reverted = false;
        try calculator.subtract(5, 10) {
            // Should not reach here
        } catch {
            reverted = true;
        }
        assertTrue(reverted, "Subtraction underflow should revert");
    }
    
    /*//////////////////////////////////////////////////////////////
                            STRESS TESTING
    //////////////////////////////////////////////////////////////*/
    
    function stressTest(uint256 iterations) external returns (uint256) {
        uint256 gasStart = gasleft();
        
        for (uint256 i = 1; i <= iterations; i++) {
            calculator.add(i, i * 2);
            calculator.multiply(i, 3);
            
            if (i >= 2) {
                calculator.subtract(i * 2, i);
                calculator.divide(i * 6, 2);
            }
        }
        
        return gasStart - gasleft();
    }
}