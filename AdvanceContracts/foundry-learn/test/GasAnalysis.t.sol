// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../src/Calculator.sol";
import "../src/CalculatorOptimized.sol";

/**
 * @title GasAnalysisTest
 * @dev Specialized contract for detailed gas consumption analysis
 */
contract GasAnalysisTest {
    Calculator public calculator;
    CalculatorOptimized public calculatorOptimized;
    
    event GasUsed(string operation, uint256 gasAmount);
    
    constructor() {
        calculator = new Calculator();
        calculatorOptimized = new CalculatorOptimized();
    }
    
    /*//////////////////////////////////////////////////////////////
                        INDIVIDUAL OPERATION GAS TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testOriginalAdditionGas() external {
        uint256 gasStart = gasleft();
        calculator.add(100, 200);
        uint256 gasUsed = gasStart - gasleft();
        emit GasUsed("Original Addition", gasUsed);
    }
    
    function testOptimizedAdditionGas() external {
        uint256 gasStart = gasleft();
        calculatorOptimized.add(100, 200);
        uint256 gasUsed = gasStart - gasleft();
        emit GasUsed("Optimized Addition", gasUsed);
    }
    
    function testPureAdditionGas() external {
        uint256 gasStart = gasleft();
        calculatorOptimized.addPure(100, 200);
        uint256 gasUsed = gasStart - gasleft();
        emit GasUsed("Pure Addition", gasUsed);
    }
    
    function testOriginalSubtractionGas() external {
        uint256 gasStart = gasleft();
        calculator.subtract(300, 100);
        uint256 gasUsed = gasStart - gasleft();
        emit GasUsed("Original Subtraction", gasUsed);
    }
    
    function testOptimizedSubtractionGas() external {
        uint256 gasStart = gasleft();
        calculatorOptimized.subtract(300, 100);
        uint256 gasUsed = gasStart - gasleft();
        emit GasUsed("Optimized Subtraction", gasUsed);
    }
    
    function testPureSubtractionGas() external {
        uint256 gasStart = gasleft();
        calculatorOptimized.subtractPure(300, 100);
        uint256 gasUsed = gasStart - gasleft();
        emit GasUsed("Pure Subtraction", gasUsed);
    }
    
    function testOriginalMultiplicationGas() external {
        uint256 gasStart = gasleft();
        calculator.multiply(25, 8);
        uint256 gasUsed = gasStart - gasleft();
        emit GasUsed("Original Multiplication", gasUsed);
    }
    
    function testOptimizedMultiplicationGas() external {
        uint256 gasStart = gasleft();
        calculatorOptimized.multiply(25, 8);
        uint256 gasUsed = gasStart - gasleft();
        emit GasUsed("Optimized Multiplication", gasUsed);
    }
    
    function testPureMultiplicationGas() external {
        uint256 gasStart = gasleft();
        calculatorOptimized.multiplyPure(25, 8);
        uint256 gasUsed = gasStart - gasleft();
        emit GasUsed("Pure Multiplication", gasUsed);
    }
    
    function testOriginalDivisionGas() external {
        uint256 gasStart = gasleft();
        calculator.divide(144, 12);
        uint256 gasUsed = gasStart - gasleft();
        emit GasUsed("Original Division", gasUsed);
    }
    
    function testOptimizedDivisionGas() external {
        uint256 gasStart = gasleft();
        calculatorOptimized.divide(144, 12);
        uint256 gasUsed = gasStart - gasleft();
        emit GasUsed("Optimized Division", gasUsed);
    }
    
    function testPureDivisionGas() external {
        uint256 gasStart = gasleft();
        calculatorOptimized.dividePure(144, 12);
        uint256 gasUsed = gasStart - gasleft();
        emit GasUsed("Pure Division", gasUsed);
    }
    
    /*//////////////////////////////////////////////////////////////
                        BATCH OPERATIONS GAS TESTS
    //////////////////////////////////////////////////////////////*/
    
    function testOriginalBatchGas() external {
        uint8[] memory operations = new uint8[](4);
        operations[0] = 0; operations[1] = 1; operations[2] = 2; operations[3] = 3;
        
        uint256[] memory operands = new uint256[](8);
        operands[0] = 100; operands[1] = 50;
        operands[2] = 200; operands[3] = 75;
        operands[4] = 25;  operands[5] = 4;
        operands[6] = 144; operands[7] = 12;
        
        uint256 gasStart = gasleft();
        calculator.batchOperations(operations, operands);
        uint256 gasUsed = gasStart - gasleft();
        emit GasUsed("Original Batch Operations", gasUsed);
    }
    
    function testOptimizedBatchGas() external {
        uint256[] memory operands = new uint256[](8);
        operands[0] = 100; operands[1] = 50;
        operands[2] = 200; operands[3] = 75;
        operands[4] = 25;  operands[5] = 4;
        operands[6] = 144; operands[7] = 12;
        
        uint256 gasStart = gasleft();
        calculatorOptimized.calculateBatch(operands);
        uint256 gasUsed = gasStart - gasleft();
        emit GasUsed("Optimized Batch Operations", gasUsed);
    }
    
    function testIndividualOperationsGas() external {
        uint256 gasStart = gasleft();
        calculator.add(100, 50);
        calculator.subtract(200, 75);
        calculator.multiply(25, 4);
        calculator.divide(144, 12);
        uint256 gasUsed = gasStart - gasleft();
        emit GasUsed("Individual Operations Total", gasUsed);
    }
    
    /*//////////////////////////////////////////////////////////////
                        STRESS TEST GAS ANALYSIS
    //////////////////////////////////////////////////////////////*/
    
    function testStressOriginal(uint256 iterations) external {
        uint256 gasStart = gasleft();
        
        for (uint256 i = 1; i <= iterations; i++) {
            calculator.add(i, i * 2);
            
            if (i >= 2) {
                calculator.subtract(i * 2, i);
            }
        }
        
        uint256 gasUsed = gasStart - gasleft();
        emit GasUsed("Stress Test Original", gasUsed);
    }
    
    function testStressOptimized(uint256 iterations) external {
        uint256 gasStart = gasleft();
        
        for (uint256 i = 1; i <= iterations; i++) {
            calculatorOptimized.add(i, i * 2);
            
            if (i >= 2) {
                calculatorOptimized.subtract(i * 2, i);
            }
        }
        
        uint256 gasUsed = gasStart - gasleft();
        emit GasUsed("Stress Test Optimized", gasUsed);
    }
    
    function testStressPure(uint256 iterations) external {
        uint256 gasStart = gasleft();
        
        for (uint256 i = 1; i <= iterations; i++) {
            calculatorOptimized.addPure(i, i * 2);
            
            if (i >= 2) {
                calculatorOptimized.subtractPure(i * 2, i);
            }
        }
        
        uint256 gasUsed = gasStart - gasleft();
        emit GasUsed("Stress Test Pure", gasUsed);
    }
    
    /*//////////////////////////////////////////////////////////////
                        DEPLOYMENT COST ANALYSIS
    //////////////////////////////////////////////////////////////*/
    
    function testDeploymentCosts() external {
        // Test original calculator deployment
        uint256 gasStart = gasleft();
        new Calculator();
        uint256 originalDeployGas = gasStart - gasleft();
        emit GasUsed("Original Calculator Deployment", originalDeployGas);
        
        // Test optimized calculator deployment
        gasStart = gasleft();
        new CalculatorOptimized();
        uint256 optimizedDeployGas = gasStart - gasleft();
        emit GasUsed("Optimized Calculator Deployment", optimizedDeployGas);
    }
}