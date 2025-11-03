// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/**
 * @title CalculatorOptimized
 * @dev Gas-optimized version of Calculator contract
 * @author Foundry Learning Project
 */
contract CalculatorOptimized {
    // Optimization 1: Use uint32 instead of uint256 for operation count to save storage
    uint32 public operationCount;
    
    // Optimization 2: Remove operation history mapping to save significant gas
    // mapping(uint256 => string) public operationHistory; // Removed
    
    // Optimization 3: Use more specific event parameters to reduce gas cost
    event Operation(uint8 indexed opType, uint256 a, uint256 b, uint256 result);
    
    /**
     * @dev Add two numbers - optimized version
     * @param a First number
     * @param b Second number
     * @return result The sum of a and b
     */
    function add(uint256 a, uint256 b) public returns (uint256 result) {
        // Optimization 4: Avoid intermediate variable assignment when possible
        result = a + b;
        
        // Optimization 5: Use unchecked block for operation count increment
        unchecked {
            ++operationCount;
        }
        
        // Optimization 6: Use single event with operation type
        emit Operation(0, a, b, result);
        return result;
    }
    
    /**
     * @dev Subtract two numbers - optimized version
     */
    function subtract(uint256 a, uint256 b) public returns (uint256 result) {
        require(a >= b, "Underflow");
        result = a - b;
        
        unchecked {
            ++operationCount;
        }
        
        emit Operation(1, a, b, result);
        return result;
    }
    
    /**
     * @dev Multiply two numbers - optimized version
     */
    function multiply(uint256 a, uint256 b) public returns (uint256 result) {
        result = a * b;
        
        unchecked {
            ++operationCount;
        }
        
        emit Operation(2, a, b, result);
        return result;
    }
    
    /**
     * @dev Divide two numbers - optimized version
     */
    function divide(uint256 a, uint256 b) public returns (uint256 result) {
        require(b != 0, "Division by zero");
        result = a / b;
        
        unchecked {
            ++operationCount;
        }
        
        emit Operation(3, a, b, result);
        return result;
    }
    
    /**
     * @dev Pure function versions for maximum gas efficiency
     * These don't modify state and consume minimal gas
     */
    function addPure(uint256 a, uint256 b) public pure returns (uint256) {
        return a + b;
    }
    
    function subtractPure(uint256 a, uint256 b) public pure returns (uint256) {
        require(a >= b, "Underflow");
        return a - b;
    }
    
    function multiplyPure(uint256 a, uint256 b) public pure returns (uint256) {
        return a * b;
    }
    
    function dividePure(uint256 a, uint256 b) public pure returns (uint256) {
        require(b != 0, "Division by zero");
        return a / b;
    }
    
    /**
     * @dev Optimized batch operations
     * @param operations Packed operations in single bytes32 (4 operations per byte)
     * @param operands Array of operand pairs
     * @return results Array of results
     */
    function batchOperationsOptimized(bytes32 operations, uint256[] calldata operands) 
        external 
        returns (uint256[] memory results) 
    {
        // Optimization 7: Use calldata instead of memory for input arrays
        // Optimization 8: Pack multiple operations in single bytes32
        
        uint256 opCount = operands.length / 2;
        require(opCount <= 32, "Too many operations"); // Max 32 operations per batch
        
        results = new uint256[](opCount);
        
        for (uint256 i = 0; i < opCount;) {
            uint8 op = uint8(operations[i]);
            uint256 a = operands[i * 2];
            uint256 b = operands[i * 2 + 1];
            
            if (op == 0) {
                results[i] = a + b;
            } else if (op == 1) {
                require(a >= b, "Underflow");
                results[i] = a - b;
            } else if (op == 2) {
                results[i] = a * b;
            } else if (op == 3) {
                require(b != 0, "Division by zero");
                results[i] = a / b;
            } else {
                revert("Invalid operation");
            }
            
            // Optimization 9: Use unchecked increment in loop
            unchecked {
                ++i;
            }
        }
        
        // Optimization 10: Batch update operation count
        unchecked {
            operationCount += uint32(opCount);
        }
        
        return results;
    }
    
    /**
     * @dev Extremely optimized calculator for specific use cases
     * No events, no state changes, pure computation
     */
    function calculateBatch(uint256[] calldata operands) external pure returns (uint256[4] memory results) {
        // Assumes exactly 8 operands for 4 operations: add, sub, mul, div
        require(operands.length == 8, "Invalid operands");
        
        // Optimization 11: Fixed-size array and direct indexing
        results[0] = operands[0] + operands[1]; // add
        results[1] = operands[2] - operands[3]; // sub (assume no underflow)
        results[2] = operands[4] * operands[5]; // mul
        results[3] = operands[6] / operands[7]; // div (assume no zero division)
        
        return results;
    }
}