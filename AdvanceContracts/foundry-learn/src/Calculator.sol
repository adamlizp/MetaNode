// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/**
 * @title Calculator
 * @dev A simple calculator contract for basic arithmetic operations
 * @author Foundry Learning Project
 */
contract Calculator {
    // State variables to track operation history
    uint256 public operationCount;
    mapping(uint256 => string) public operationHistory;
    
    // Events for logging operations
    event Addition(uint256 a, uint256 b, uint256 result);
    event Subtraction(uint256 a, uint256 b, uint256 result);
    event Multiplication(uint256 a, uint256 b, uint256 result);
    event Division(uint256 a, uint256 b, uint256 result);
    
    /**
     * @dev Add two numbers
     * @param a First number
     * @param b Second number
     * @return result The sum of a and b
     */
    function add(uint256 a, uint256 b) public returns (uint256 result) {
        result = a + b;
        
        // Record operation in history
        operationCount++;
        operationHistory[operationCount] = string(abi.encodePacked("add(", _toString(a), ",", _toString(b), ")=", _toString(result)));
        
        emit Addition(a, b, result);
        return result;
    }
    
    /**
     * @dev Subtract two numbers
     * @param a First number (minuend)
     * @param b Second number (subtrahend)
     * @return result The difference of a and b
     */
    function subtract(uint256 a, uint256 b) public returns (uint256 result) {
        require(a >= b, "Calculator: underflow protection");
        result = a - b;
        
        // Record operation in history
        operationCount++;
        operationHistory[operationCount] = string(abi.encodePacked("subtract(", _toString(a), ",", _toString(b), ")=", _toString(result)));
        
        emit Subtraction(a, b, result);
        return result;
    }
    
    /**
     * @dev Multiply two numbers
     * @param a First number
     * @param b Second number
     * @return result The product of a and b
     */
    function multiply(uint256 a, uint256 b) public returns (uint256 result) {
        result = a * b;
        
        // Record operation in history
        operationCount++;
        operationHistory[operationCount] = string(abi.encodePacked("multiply(", _toString(a), ",", _toString(b), ")=", _toString(result)));
        
        emit Multiplication(a, b, result);
        return result;
    }
    
    /**
     * @dev Divide two numbers
     * @param a Dividend
     * @param b Divisor
     * @return result The quotient of a and b
     */
    function divide(uint256 a, uint256 b) public returns (uint256 result) {
        require(b != 0, "Calculator: division by zero");
        result = a / b;
        
        // Record operation in history
        operationCount++;
        operationHistory[operationCount] = string(abi.encodePacked("divide(", _toString(a), ",", _toString(b), ")=", _toString(result)));
        
        emit Division(a, b, result);
        return result;
    }
    
    /**
     * @dev Batch operations for gas optimization testing
     * @param operations Array of operation types (0=add, 1=sub, 2=mul, 3=div)
     * @param operands Array of operand pairs [a1,b1,a2,b2,...]
     * @return results Array of results
     */
    function batchOperations(uint8[] memory operations, uint256[] memory operands) 
        public 
        returns (uint256[] memory results) 
    {
        require(operations.length * 2 == operands.length, "Calculator: invalid operands length");
        
        results = new uint256[](operations.length);
        
        for (uint256 i = 0; i < operations.length; i++) {
            uint256 a = operands[i * 2];
            uint256 b = operands[i * 2 + 1];
            
            if (operations[i] == 0) {
                results[i] = a + b;
                emit Addition(a, b, results[i]);
            } else if (operations[i] == 1) {
                require(a >= b, "Calculator: underflow protection");
                results[i] = a - b;
                emit Subtraction(a, b, results[i]);
            } else if (operations[i] == 2) {
                results[i] = a * b;
                emit Multiplication(a, b, results[i]);
            } else if (operations[i] == 3) {
                require(b != 0, "Calculator: division by zero");
                results[i] = a / b;
                emit Division(a, b, results[i]);
            } else {
                revert("Calculator: invalid operation");
            }
        }
        
        // Update operation count in batch
        operationCount += operations.length;
        
        return results;
    }
    
    /**
     * @dev Get the last operation from history
     * @return operation The last operation string
     */
    function getLastOperation() public view returns (string memory operation) {
        require(operationCount > 0, "Calculator: no operations performed");
        return operationHistory[operationCount];
    }
    
    /**
     * @dev Clear operation history
     */
    function clearHistory() public {
        for (uint256 i = 1; i <= operationCount; i++) {
            delete operationHistory[i];
        }
        operationCount = 0;
    }
    
    /**
     * @dev Helper function to convert uint256 to string
     * @param value The number to convert
     * @return The string representation
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}