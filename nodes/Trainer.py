import torch
import torch.nn as nn
import torch.optim as optim
import pytorch_lightning as pl

class Trainer(pl.LightningModule):
    def __init__(self, lr=0.001, epochs=1000, criterion=nn.MSELoss(), optimizer_class=optim.Adam, patience=10, **optimizer_kwargs):
        super(Trainer, self).__init__()
        self.lr = lr
        self.epochs = epochs
        self.criterion = criterion
        self.optimizer_class = optimizer_class
        self.patience = patience
        self.optimizer_kwargs = optimizer_kwargs

    def forward(self, model, targets):
        # Initialize optimizer
        optimizer = self.optimizer_class(model.parameters(), lr=self.lr, **self.optimizer_kwargs)
        
        best_loss = float('inf')
        epochs_no_improve = 0
        
        # Training loop
        for epoch in range(self.epochs):
            # Zero gradients
            optimizer.zero_grad()
            
            # Forward pass
            outputs = model()
            
            # Compute loss
            loss = self.criterion(outputs, targets)
            
            # Backward pass and optimize
            loss.backward()
            optimizer.step()
            
            # Print loss for each epoch
            print(f'Epoch [{epoch+1}/{self.epochs}], Loss: {loss.item()}')
            
            # Early stopping logic
            if loss.item() < best_loss:
                best_loss = loss.item()
                epochs_no_improve = 0
            else:
                epochs_no_improve += 1
            
            if epochs_no_improve >= self.patience:
                print(f'Early stopping at epoch {epoch+1}')
                break

# Example usage:
if __name__ == "__main__":
    # Dummy model, input, and target for demonstration purposes
    class SimpleModel(pl.LightningModule):
        def __init__(self):
            super(SimpleModel, self).__init__()
            self.linear = nn.Linear(10, 1)
        
        def forward(self, x):
            return self.linear(x)
    
    
    
    # Example input and target tensors
    inputs = torch.randn(5, 10)
    targets = torch.randn(5, 1)
    
    # Create a simple model instance
    model = SimpleModel().forward(inputs)
    
    # Create Trainer instance with early stopping patience set to 5 epochs
    trainer = Trainer(lr=0.01, epochs=100, criterion=nn.MSELoss(), patience=5)
    
    # Train the model
    trainer(model, targets)
